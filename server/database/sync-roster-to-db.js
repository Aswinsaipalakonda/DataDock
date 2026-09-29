require('dotenv').config({ path: '.env.local' });
if (!process.env.DB_HOST) require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const roster = require('../../lib/data/student-roster.json');

async function syncRoster() {
  console.log(`Syncing ${roster.length} students to MySQL...`);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'de_elearn',
  });

  const BATCH_SIZE = 50;
  for (let i = 0; i < roster.length; i += BATCH_SIZE) {
    const chunk = roster.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (st) => {
        const passwordHash = await bcrypt.hash(st.rollNumber, 10);
        const userId = crypto.randomUUID();

        await connection.query(
          `INSERT INTO users (
             id, email, password_hash, name, role, status,
             branch, academic_year, current_semester, section,
             roll_number, first_login_pending
           )
           VALUES (?, ?, ?, ?, 'student', 'active', ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             branch = VALUES(branch),
             academic_year = VALUES(academic_year),
             current_semester = VALUES(current_semester),
             section = VALUES(section),
             roll_number = VALUES(roll_number),
             status = 'active'`,
          [
            userId,
            st.email,
            passwordHash,
            st.name,
            st.branch,
            st.year,
            st.semester,
            st.section,
            st.rollNumber,
          ]
        );
      })
    );
  }

  const [tot] = await connection.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
  console.log(`✓ Sync complete! Total students in DB: ${tot[0].count}`);

  const [semBreakdown] = await connection.query(`
    SELECT current_semester, branch, section, COUNT(*) as c
    FROM users
    WHERE role = 'student'
    GROUP BY current_semester, branch, section
    ORDER BY current_semester, branch, section
  `);
  console.log('Breakdown:', semBreakdown);

  await connection.end();
}

syncRoster().catch(console.error);
