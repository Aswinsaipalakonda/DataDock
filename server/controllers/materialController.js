const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/db');
const { uploadBaseDir } = require('../middleware/upload');

async function getMaterials(req, res) {
  try {
    const { branch, section, semester, subject, type, state, ownerId, search } = req.query;
    const user = req.user;

    let query = `
      SELECT m.*, u.name as owner_name, u.email as owner_email,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.material_id = m.id AND b.user_id = ?) as is_bookmarked,
        (SELECT COUNT(*) FROM activity_events ae WHERE ae.target_id = m.id AND ae.type = 'download') as download_count,
        (SELECT COUNT(*) FROM activity_events ae WHERE ae.target_id = m.id AND ae.type = 'view') as view_count
      FROM materials m
      JOIN users u ON m.owner_id = u.id
      WHERE 1=1
    `;
    const params = [user ? user.id : ''];

    // Enforce role-based viewing rules
    if (!user || user.role === 'student') {
      query += ` AND m.state = 'published'`;
      if (user && user.branch) {
        query += ` AND m.branch = ?`;
        params.push(user.branch);
      }
      if (user && user.current_semester) {
        query += ` AND m.semester = ?`;
        params.push(user.current_semester);
      }
      if (user && user.section) {
        query += ` AND (m.section = ? OR m.section = 'ALL' OR m.section IS NULL)`;
        params.push(user.section);
      } else {
        query += ` AND (m.section = 'A' OR m.section = 'ALL' OR m.section IS NULL)`;
      }
    } else if (user.role === 'faculty') {
      if (ownerId === 'me') {
        query += ` AND m.owner_id = ?`;
        params.push(user.id);
      }
    }

    if (branch && branch !== 'all') {
      query += ` AND m.branch = ?`;
      params.push(branch);
    }
    if (section && section !== 'all') {
      query += ` AND (m.section = ? OR m.section = 'ALL')`;
      params.push(section);
    }
    if (semester && semester !== 'all') {
      query += ` AND m.semester = ?`;
      params.push(parseInt(semester, 10));
    }
    if (subject && subject !== 'all') {
      query += ` AND m.subject = ?`;
      params.push(subject);
    }
    if (type && type !== 'all') {
      query += ` AND m.type = ?`;
      params.push(type);
    }
    if (state && state !== 'all') {
      query += ` AND m.state = ?`;
      params.push(state);
    }
    if (search) {
      query += ` AND (m.title LIKE ? OR m.description LIKE ? OR m.subject LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY m.created_at DESC LIMIT 100`;

    const [materials] = await pool.query(query, params);

    // Attach file lists to materials
    if (materials.length > 0) {
      const materialIds = materials.map((m) => m.id);
      const [files] = await pool.query(
        'SELECT id, material_id, file_name, mime_type, size, version, storage_path, created_at FROM material_files WHERE material_id IN (?)',
        [materialIds]
      );

      const filesMap = {};
      files.forEach((f) => {
        if (!filesMap[f.material_id]) filesMap[f.material_id] = [];
        filesMap[f.material_id].push(f);
      });

      materials.forEach((m) => {
        m.files = filesMap[m.id] || [];
        m.is_bookmarked = Boolean(m.is_bookmarked);
      });
    }

    return res.json({ success: true, materials });
  } catch (err) {
    console.error('getMaterials error:', err);
    return res.status(500).json({ error: 'Failed to retrieve materials.' });
  }
}

async function getMaterialById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.query(
      `SELECT m.*, u.name as owner_name, u.email as owner_email,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.material_id = m.id AND b.user_id = ?) as is_bookmarked
       FROM materials m
       JOIN users u ON m.owner_id = u.id
       WHERE m.id = ? LIMIT 1`,
      [user ? user.id : '', id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const material = rows[0];
    material.is_bookmarked = Boolean(material.is_bookmarked);

    const [files] = await pool.query(
      'SELECT id, material_id, file_name, mime_type, size, version, storage_path, created_at FROM material_files WHERE material_id = ?',
      [id]
    );
    material.files = files;

    // Log view event asynchronously
    if (user) {
      pool.query(
        'INSERT INTO activity_events (id, type, actor_id, target_id, metadata) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'view', user.id, id, JSON.stringify({ timestamp: new Date() })]
      ).catch(() => {});
    }

    return res.json({ success: true, material });
  } catch (err) {
    console.error('getMaterialById error:', err);
    return res.status(500).json({ error: 'Failed to retrieve material details.' });
  }
}

async function uploadMaterial(req, res) {
  try {
    const user = req.user;
    const { 
      title, 
      description, 
      subject, 
      branch, 
      branches, 
      section, 
      sections, 
      allocations, 
      semester, 
      regulation, 
      type, 
      state, 
      tags 
    } = req.body;

    if (!title || !subject || !semester || !type) {
      return res.status(400).json({ error: 'Missing required material metadata (title, subject, semester, type).' });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'At least one file is required.' });
    }

    // Build target allocations: array of { branch: string, section: string }
    let targetAllocations = [];
    if (allocations) {
      try {
        targetAllocations = typeof allocations === 'string' ? JSON.parse(allocations) : allocations;
      } catch {
        targetAllocations = [];
      }
    }

    if (!targetAllocations || !targetAllocations.length) {
      let targetBranches = [];
      if (branches) {
        targetBranches = Array.isArray(branches) ? branches : branches.split(',').map((b) => b.trim()).filter(Boolean);
      }
      if (!targetBranches.length && branch) {
        targetBranches = [branch];
      }
      if (!targetBranches.length) {
        targetBranches = ['CIC'];
      }

      const parsedSections = sections 
        ? (Array.isArray(sections) ? sections : sections.split(',').map((s) => s.trim()).filter(Boolean)) 
        : (section ? [section] : ['ALL']);

      for (const b of targetBranches) {
        for (const sec of parsedSections) {
          targetAllocations.push({ branch: b, section: sec || 'ALL' });
        }
      }
    }

    const parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : (tags || []);
    const createdMaterialIds = [];

    for (const alloc of targetAllocations) {
      const targetBranch = alloc.branch;
      const targetSection = alloc.section || 'ALL';
      const materialId = crypto.randomUUID();

      // Ensure branch, semester, regulation, and subject exist
      await pool.query('INSERT IGNORE INTO branches (code, name, active) VALUES (?, ?, 1)', [targetBranch, targetBranch]);
      await pool.query('INSERT IGNORE INTO semesters (number, name, active) VALUES (?, ?, 1)', [parseInt(semester, 10), `${semester}th Semester`]);
      await pool.query('INSERT IGNORE INTO regulations (code, name, active) VALUES (?, ?, 1)', [regulation || 'R23', `${regulation || 'R23'} Autonomous Regulation`]);
      await pool.query(
        'INSERT IGNORE INTO subjects (code, title, branch, semester, regulation, active) VALUES (?, ?, ?, ?, ?, 1)',
        [subject, `${subject} Course`, targetBranch, parseInt(semester, 10), regulation || 'R23']
      );

      // Insert material
      await pool.query(
        `INSERT INTO materials (id, title, description, subject, branch, section, semester, regulation, type, state, owner_id, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          materialId,
          title,
          description || '',
          subject,
          targetBranch,
          targetSection,
          parseInt(semester, 10),
          regulation || 'R23',
          type,
          state || 'published',
          user.id,
          JSON.stringify(parsedTags),
        ]
      );

      // Insert files
      for (const f of files) {
        const fileId = crypto.randomUUID();
        await pool.query(
          `INSERT INTO material_files (id, material_id, file_name, mime_type, size, version, storage_path)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [fileId, materialId, f.originalname, f.mimetype, f.size, f.filename]
        );
      }

      createdMaterialIds.push(materialId);
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (id, action, actor_id, object_id, after_summary) VALUES (?, ?, ?, ?, ?)',
      [
        crypto.randomUUID(),
        'UPLOAD_MATERIAL',
        user.id,
        createdMaterialIds[0],
        JSON.stringify({ title, filesCount: files.length, allocations: targetAllocations })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Uploaded material successfully to ${targetAllocations.length} cohort target(s).`,
      materialIds: createdMaterialIds,
    });
  } catch (err) {
    console.error('uploadMaterial error:', err);
    return res.status(500).json({ error: 'Failed to upload material.' });
  }
}

async function updateMaterial(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { title, description, state, type, tags } = req.body;

    const [rows] = await pool.query('SELECT * FROM materials WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const material = rows[0];
    if (user.role !== 'admin' && material.owner_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to edit this material.' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (state !== undefined) { updates.push('state = ?'); params.push(state); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (tags !== undefined) {
      const parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : tags;
      updates.push('tags = ?');
      params.push(JSON.stringify(parsedTags));
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No fields to update.' });
    }

    params.push(id);
    await pool.query(`UPDATE materials SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    return res.json({ success: true, message: 'Material updated successfully.' });
  } catch (err) {
    console.error('updateMaterial error:', err);
    return res.status(500).json({ error: 'Failed to update material.' });
  }
}

async function deleteMaterial(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.query('SELECT * FROM materials WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    const material = rows[0];
    if (user.role !== 'admin' && material.owner_id !== user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this material.' });
    }

    // Get files to unlink from disk
    const [files] = await pool.query('SELECT storage_path FROM material_files WHERE material_id = ?', [id]);
    for (const f of files) {
      const diskPath = path.join(uploadBaseDir, f.storage_path);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch (e) {}
      }
    }

    await pool.query('DELETE FROM materials WHERE id = ?', [id]);

    return res.json({ success: true, message: 'Material deleted successfully.' });
  } catch (err) {
    console.error('deleteMaterial error:', err);
    return res.status(500).json({ error: 'Failed to delete material.' });
  }
}

async function downloadFile(req, res) {
  try {
    const rawParam = req.params.filePath || req.params.fileId || req.params[0] || '';
    const cleanRef = rawParam.replace(/\/download\/?$/, '').replace(/^\//, '');
    const user = req.user;

    const [files] = await pool.query(
      `SELECT mf.*, m.branch, m.semester, m.state, m.title as material_title
       FROM material_files mf
       JOIN materials m ON mf.material_id = m.id
       WHERE mf.id = ? OR mf.storage_path = ? OR mf.storage_ref = ? OR mf.storage_path LIKE ?
       LIMIT 1`,
      [cleanRef, cleanRef, cleanRef, `%${cleanRef}`]
    );

    if (!files.length) {
      // Fallback: check if file directly exists on disk by cleanRef
      const directDiskPath = path.join(uploadBaseDir, cleanRef);
      if (fs.existsSync(directDiskPath)) {
        const baseName = path.basename(directDiskPath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(baseName)}"`);
        return fs.createReadStream(directDiskPath).pipe(res);
      }
      return res.status(404).json({ error: 'Requested file not found.' });
    }

    const fileRecord = files[0];

    if (user && user.role === 'student' && fileRecord.state !== 'published') {
      return res.status(403).json({ error: 'Material is not currently available for download.' });
    }

    const diskPath = path.join(uploadBaseDir, fileRecord.storage_path || fileRecord.storage_ref);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ error: 'File content does not exist on storage.' });
    }

    // Record download event
    if (user) {
      pool.query(
        'INSERT INTO activity_events (id, type, actor_id, target_id, metadata) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), 'download', user.id, fileRecord.material_id, JSON.stringify({ fileId: fileRecord.id, fileName: fileRecord.file_name })]
      ).catch(() => {});
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true' || req.path.includes('/download');
    const disposition = isDownload ? 'attachment' : 'inline';

    res.setHeader('Content-Type', fileRecord.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileRecord.file_name)}"`);
    res.setHeader('Content-Length', fileRecord.size);

    const stream = fs.createReadStream(diskPath);
    stream.pipe(res);
  } catch (err) {
    console.error('downloadFile error:', err);
    return res.status(500).json({ error: 'Failed to process file download.' });
  }
}

async function toggleBookmark(req, res) {
  try {
    const { materialId } = req.params;
    const user = req.user;

    const [existing] = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = ? AND material_id = ? LIMIT 1',
      [user.id, materialId]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM bookmarks WHERE id = ?', [existing[0].id]);
      return res.json({ success: true, bookmarked: false, message: 'Bookmark removed.' });
    } else {
      await pool.query(
        'INSERT INTO bookmarks (id, user_id, material_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), user.id, materialId]
      );
      return res.json({ success: true, bookmarked: true, message: 'Bookmark saved.' });
    }
  } catch (err) {
    console.error('toggleBookmark error:', err);
    return res.status(500).json({ error: 'Failed to toggle bookmark.' });
  }
}

module.exports = {
  getMaterials,
  getMaterialById,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  downloadFile,
  toggleBookmark,
};
