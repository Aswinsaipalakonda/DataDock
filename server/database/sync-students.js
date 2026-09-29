require('dotenv').config({ path: '.env.local' });
if (!process.env.DB_HOST) {
  require('dotenv').config();
}

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

async function syncStudents() {
  console.log('====================================================');
  console.log('🔄 SYNCING STUDENT ROSTER (INCLUDING LATERAL ENTRIES)');
  console.log('====================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'de_elearn',
  });

  try {
    console.log('✓ Connected to MySQL database:', process.env.DB_NAME || 'de_elearn');

    let parsedStudents = [];
    const jsonMasterPath = path.join(process.cwd(), 'data', 'students-master-sem3.json');

    if (fs.existsSync(jsonMasterPath)) {
      parsedStudents = JSON.parse(fs.readFileSync(jsonMasterPath, 'utf8'));
      console.log(`✓ Loaded ${parsedStudents.length} Semester 3 students from JSON master data.`);
    } else {
      const pyScriptPath = path.join(__dirname, 'parse_iiisem.py');
      const pyCode = `import openpyxl, re, json

students = []
wb = openpyxl.load_workbook('data/IIISem.xlsx')
for s in wb.sheetnames:
    sheet = wb[s]
    for r in range(1, sheet.max_row+1):
        vals = [sheet.cell(r, c).value for c in range(1, sheet.max_column+1)]
        for ci, v in enumerate(vals):
            sv = str(v or '').strip().upper()
            if re.match(r'^[0-9]{2}33[15]A[0-9A-Z]{4}$', sv):
                name = vals[ci-1].strip() if ci >= 1 and isinstance(vals[ci-1], str) else ''
                branch = str(vals[3] or '').strip()
                sem = vals[4]
                sec = str(vals[5] or '').strip()
                students.append({
                    'rollNumber': sv,
                    'name': name,
                    'email': f"{sv.lower()}@mvgrce.edu.in",
                    'branch': branch,
                    'semester': int(sem) if sem else 3,
                    'section': sec or 'A',
                    'year': 2025
                })
with open('data/iiisem_parsed.json', 'w') as f:
    json.dump(students, f)
`;
      fs.writeFileSync(pyScriptPath, pyCode);
      execSync(`python "${pyScriptPath}"`, { cwd: process.cwd() });
      if (fs.existsSync(pyScriptPath)) fs.unlinkSync(pyScriptPath);

      const parsedJsonPath = path.join(process.cwd(), 'data', 'iiisem_parsed.json');
      parsedStudents = JSON.parse(fs.readFileSync(parsedJsonPath, 'utf8'));
      if (fs.existsSync(parsedJsonPath)) fs.unlinkSync(parsedJsonPath);
    }

    console.log(`✓ Parsed ${parsedStudents.length} Semester 3 students from data/IIISem.xlsx`);

    let newCount = 0;
    let updatedCount = 0;

    for (const st of parsedStudents) {
      const [existing] = await connection.query(
        'SELECT id, roll_number FROM users WHERE roll_number = ? OR email = ?',
        [st.rollNumber, st.email]
      );

      if (existing.length === 0) {
        const passwordHash = await bcrypt.hash(st.rollNumber, 10);
        const userId = crypto.randomUUID();

        await connection.query(
          `INSERT INTO users (
             id, email, password_hash, name, role, status,
             branch, academic_year, current_semester, section,
             roll_number, first_login_pending
           )
           VALUES (?, ?, ?, ?, 'student', 'active', ?, ?, ?, ?, ?, 1)`,
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
        newCount++;
      } else {
        await connection.query(
          `UPDATE users SET
             name = ?,
             branch = ?,
             academic_year = ?,
             current_semester = ?,
             section = ?,
             status = 'active'
           WHERE id = ?`,
          [st.name, st.branch, st.year, st.semester, st.section, existing[0].id]
        );
        updatedCount++;
      }
    }

    console.log(`\n🎉 Student Sync Completed:`);
    console.log(`   - New Students Inserted: ${newCount}`);
    console.log(`   - Existing Students Updated: ${updatedCount}`);
    console.log(`   - Total Semester 3 Students: ${parsedStudents.length}`);

    const [totalStudents] = await connection.query('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    console.log(`   - Total Active Students in Database: ${totalStudents[0].count}`);

  } catch (err) {
    console.error('❌ Error during student sync:', err);
  } finally {
    await connection.end();
  }
}

syncStudents();
