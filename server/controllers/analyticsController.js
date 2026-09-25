const pool = require('../config/db');

async function getStats(req, res) {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalStudents }]] = await pool.query("SELECT COUNT(*) as totalStudents FROM users WHERE role = 'student'");
    const [[{ totalFaculty }]] = await pool.query("SELECT COUNT(*) as totalFaculty FROM users WHERE role = 'faculty'");
    const [[{ totalMaterials }]] = await pool.query("SELECT COUNT(*) as totalMaterials FROM materials WHERE state = 'published'");
    const [[{ totalDownloads }]] = await pool.query("SELECT COUNT(*) as totalDownloads FROM activity_events WHERE type = 'download'");
    const [[{ totalViews }]] = await pool.query("SELECT COUNT(*) as totalViews FROM activity_events WHERE type = 'view'");
    const [[{ storageBytes }]] = await pool.query('SELECT COALESCE(SUM(size), 0) as storageBytes FROM material_files');

    // Recent activity
    const [recentActivity] = await pool.query(
      `SELECT ae.*, u.name as actor_name, m.title as material_title
       FROM activity_events ae
       LEFT JOIN users u ON ae.actor_id = u.id
       LEFT JOIN materials m ON ae.target_id = m.id
       ORDER BY ae.created_at DESC LIMIT 10`
    );

    // Downloads by branch
    const [branchStats] = await pool.query(
      `SELECT m.branch, COUNT(ae.id) as downloads
       FROM activity_events ae
       JOIN materials m ON ae.target_id = m.id
       WHERE ae.type = 'download'
       GROUP BY m.branch`
    );

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalFaculty,
        totalMaterials,
        totalDownloads,
        totalViews,
        storageBytes,
        storageFormatted: `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`,
        branchStats,
        recentActivity,
      },
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve analytics.' });
  }
}

async function getAuditLogs(req, res) {
  try {
    const { action, search } = req.query;
    let query = `
      SELECT al.*, u.name as actor_name, u.email as actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action && action !== 'all') {
      query += ' AND al.action = ?';
      params.push(action);
    }
    if (search) {
      query += ' AND (al.object_id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY al.created_at DESC LIMIT 200';
    const [logs] = await pool.query(query, params);
    return res.json({ success: true, logs });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}

const { createDatabaseBackup } = require('../database/backup');
const path = require('path');
const fs = require('fs');

async function triggerBackup(req, res) {
  try {
    const result = await createDatabaseBackup();
    if (result.success) {
      return res.json({ success: true, message: 'Backup created successfully', result });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error('triggerBackup error:', err);
    return res.status(500).json({ error: 'Failed to create backup.' });
  }
}

async function listBackups(req, res) {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, backups: [] });
    }
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
      .map((f) => {
        const fp = path.join(backupDir, f);
        const stats = fs.statSync(fp);
        return {
          filename: f,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, backups: files });
  } catch (err) {
    console.error('listBackups error:', err);
    return res.status(500).json({ error: 'Failed to list backups.' });
  }
}

module.exports = {
  getStats,
  getAuditLogs,
  triggerBackup,
  listBackups,
};
