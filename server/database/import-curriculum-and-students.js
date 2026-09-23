require('dotenv').config({ path: '.env.local' });
if (!process.env.DB_HOST) {
  require('dotenv').config();
}

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');

const DATA_DIR = path.join(process.cwd(), 'data');

async function main() {
  console.log('====================================================');
  console.log('🚀 STARTING CURRICULUM & STUDENT ROSTER INGESTION');
  console.log('====================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'de_elearn',
    multipleStatements: true,
  });

  try {
    console.log('✓ Connected to MySQL database:', process.env.DB_NAME || 'de_elearn');

    // -------------------------------------------------------------------------
    // 1. DELETE EXISTING MATERIAL
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Cleaning up existing materials ---');
    const [existingMaterials] = await connection.query('SELECT id, title FROM materials');
    console.log(`Found ${existingMaterials.length} material(s) in database.`);

    if (existingMaterials.length > 0) {
      // Delete bookmarks, files, activity events linked to materials
      await connection.query('DELETE FROM bookmarks WHERE material_id IS NOT NULL');
      await connection.query('DELETE FROM material_files');
      await connection.query("DELETE FROM activity_events WHERE type LIKE 'material%'");
      await connection.query('DELETE FROM materials');
      console.log('✓ Cleared materials, material_files, bookmarks, and material activity events.');

      // Also clean up server/uploads/materials directory if any files exist
      const uploadsDir = path.join(process.cwd(), 'server', 'uploads', 'materials');
      if (fs.existsSync(uploadsDir)) {
        const uploadFiles = fs.readdirSync(uploadsDir);
        for (const uf of uploadFiles) {
          if (uf !== '.gitkeep') {
            const p = path.join(uploadsDir, uf);
            if (fs.statSync(p).isDirectory()) {
              fs.rmSync(p, { recursive: true, force: true });
            } else {
              fs.unlinkSync(p);
            }
          }
        }
        console.log('✓ Cleaned physical upload directory server/uploads/materials');
      }
    } else {
      console.log('✓ No materials present in database.');
    }

    // -------------------------------------------------------------------------
    // 2. ENSURE R24 REGULATION EXISTS
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Registering R24 Regulation ---');
    await connection.query(`
      INSERT INTO regulations (code, name, active)
      VALUES ('R24', 'R24 Autonomous Regulation', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), active = 1;
    `);
    console.log('✓ R24 Autonomous Regulation registered in regulations table.');

    // -------------------------------------------------------------------------
    // 3. PARSE & INSERT R24 SUBJECTS (SEMESTERS 3 & 5)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Parsing & Ingesting R24 Subjects ---');

    const branchMapping = {
      'CSE(AIML)': 'CSM',
      'CSE(DS)': 'CSD',
      'CSE(ICB)': 'CIC',
      'AIML': 'CSM',
      'DS': 'CSD',
      'ICB': 'CIC',
    };

    const subjectFiles = [
      {
        file: 'AY - 2026-27 - B.Tech - III Semester R24_ Subjects Format.xlsx',
        sem: 3,
        sheets: ['CSE(AIML)', 'CSE(DS)', 'CSE(ICB)'],
      },
      {
        file: 'AY - 2026-27 - B.Tech - V Semester R24_ Subjects Format (1).xlsx',
        sem: 5,
        sheets: ['CSE(AIML)', 'CSE(DS)', 'CSE(ICB)'],
      },
    ];

    let totalSubjectsInserted = 0;

    for (const sf of subjectFiles) {
      const filePath = path.join(DATA_DIR, sf.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Subject file not found: ${filePath}`);
      }

      const wb = XLSX.readFile(filePath);

      for (const sheetName of sf.sheets) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) {
          console.warn(`Warning: Sheet ${sheetName} not found in ${sf.file}`);
          continue;
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let headerIdx = -1;
        for (let i = 0; i < rows.length; i++) {
          if (rows[i] && rows[i].some(c => String(c).includes('SUBJECT_CODE') || String(c).includes('SUBJECT_\r\nCODE') || String(c).includes('SUBJECT'))) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          console.warn(`Warning: Header row not detected in ${sf.file} [${sheetName}]`);
          continue;
        }

        const targetBranch = branchMapping[sheetName] || sheetName;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 8) continue;

          // Check if this row is a valid subject row (starts with B.TECH and has an R24 subject code)
          const degree = String(r[0] || '').trim().toUpperCase();
          const codeVal = String(r[6] || '').trim();

          if (degree !== 'B.TECH' || !codeVal.includes('R24')) {
            continue;
          }

          let code = codeVal.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
          let title = String(r[7] || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
          const sem = parseInt(r[4] || sf.sem, 10);
          const reg = String(r[2] || 'R24').trim();

          if (!code || !title) continue;

          await connection.query(
            `INSERT INTO subjects (code, title, branch, semester, regulation, active)
             VALUES (?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE title = VALUES(title), semester = VALUES(semester), active = 1`,
            [code, title, targetBranch, sem, reg]
          );

          totalSubjectsInserted++;
        }

        console.log(`  ✓ Ingested subjects for Semester ${sf.sem} - Branch ${targetBranch} (Sheet: ${sheetName})`);
      }
    }

    console.log(`✓ Total R24 subject records processed: ${totalSubjectsInserted}`);

    // -------------------------------------------------------------------------
    // 4. PARSE & INSERT STUDENTS (SEMESTERS 3, 5, 7)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Parsing Student Rosters ---');

    const studentConfigs = [
      // Semester 3 (Batch 2025)
      {
        file: 'III_SEM (CIC).xlsx',
        branch: 'CIC',
        sem: 3,
        year: 2025,
        sheets: [{ name: 'CIC', sec: 'A' }],
      },
      {
        file: 'III_SEM_CSE(AIML).xlsx',
        branch: 'CSM',
        sem: 3,
        year: 2025,
        sheets: [
          { name: 'CSE(AIML)_A', sec: 'A' },
          { name: 'CSE(AIML)_B', sec: 'B' },
        ],
      },
      {
        file: 'III_SEM_CSE(DS).xlsx',
        branch: 'CSD',
        sem: 3,
        year: 2025,
        sheets: [{ name: 'III_CSD', sec: 'A' }],
      },

      // Semester 5 (Batch 2024 + Lateral Entries)
      {
        file: 'V_SEM (CIC) (1).xlsx',
        branch: 'CIC',
        sem: 5,
        year: 2024,
        sheets: [{ name: 'CIC', sec: 'A' }],
      },
      {
        file: 'V_SEM_CSE(AIML).xlsx',
        branch: 'CSM',
        sem: 5,
        year: 2024,
        sheets: [
          { name: 'V_CSE(AIML)_A', sec: 'A' },
          { name: 'V_CSE(AIML)_B', sec: 'B' },
        ],
      },
      {
        file: 'V_SEM_CSE(DS).xlsx',
        branch: 'CSD',
        sem: 5,
        year: 2024,
        sheets: [{ name: 'V_CSD', sec: 'A' }],
      },

      // Semester 7 (Batch 2023)
      {
        file: 'VII_SEM (CIC).xls',
        branch: 'CIC',
        sem: 7,
        year: 2023,
        sheets: [{ name: 'V_list', sec: 'A' }],
      },
      {
        file: 'VII_SEM_CSE(DS).xlsx',
        branch: 'CSD',
        sem: 7,
        year: 2023,
        sheets: [{ name: 'VII_SEM_CSD', sec: 'A' }],
      },
    ];

    const studentRoster = [];
    const rollSet = new Set();

    for (const sc of studentConfigs) {
      const filePath = path.join(DATA_DIR, sc.file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Student file not found: ${filePath}`);
      }

      const wb = XLSX.readFile(filePath);

      for (const sheetDef of sc.sheets) {
        const sheet = wb.Sheets[sheetDef.name];
        if (!sheet) {
          console.warn(`Warning: Sheet ${sheetDef.name} not found in ${sc.file}`);
          continue;
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let sheetCount = 0;

        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const r = rows[rIdx];
          if (!r || !Array.isArray(r)) continue;

          for (let c = 0; c < r.length; c++) {
            const val = String(r[c] || '').trim().toUpperCase();
            // Match 10-char roll numbers: e.g., 25331A4701, 24335A4201, 25331A42D0
            if (/^[0-9]{2}33[15]A[0-9A-Z]{4}$/.test(val)) {
              let name = '';
              for (let nc = c + 1; nc < r.length; nc++) {
                if (typeof r[nc] === 'string' && r[nc].trim().length > 1) {
                  name = r[nc].trim().replace(/\s+/g, ' ');
                  break;
                }
              }

              if (name && !rollSet.has(val)) {
                rollSet.add(val);
                sheetCount++;
                studentRoster.push({
                  rollNumber: val,
                  name,
                  email: `${val.toLowerCase()}@mvgrce.edu.in`,
                  branch: sc.branch,
                  semester: sc.sem,
                  year: sc.year,
                  section: sheetDef.sec,
                });
              }
              break;
            }
          }
        }

        console.log(`  ✓ Parsed ${sheetCount} students from ${sc.file} [${sheetDef.name}] (Sem ${sc.sem} ${sc.branch} Sec ${sheetDef.sec})`);
      }
    }

    console.log(`\nTotal parsed unique students from files: ${studentRoster.length}`);

    // Pre-calculate bcrypt hashes in chunks to prevent locking
    console.log('Hashing student default passwords with bcrypt (rounds: 10)...');
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < studentRoster.length; i += BATCH_SIZE) {
      const chunk = studentRoster.slice(i, i + BATCH_SIZE);

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
          insertedCount++;
        })
      );
      process.stdout.write(`  Upserted ${insertedCount}/${studentRoster.length} students...\r`);
    }
    console.log(`\n✓ Successfully upserted all ${insertedCount} student accounts into MySQL.`);

    // -------------------------------------------------------------------------
    // 5. SUMMARY AUDIT
    // -------------------------------------------------------------------------
    console.log('\n====================================================');
    console.log('📊 DATABASE VERIFICATION SUMMARY');
    console.log('====================================================');

    const [matCount] = await connection.query('SELECT count(*) as count FROM materials');
    console.log('Remaining materials:', matCount[0].count);

    const [regCounts] = await connection.query('SELECT code, name, active FROM regulations WHERE active = 1 ORDER BY code');
    console.log('Active regulations:', regCounts);

    const [subCounts] = await connection.query(`
      SELECT regulation, semester, branch, count(*) as count 
      FROM subjects 
      GROUP BY regulation, semester, branch 
      ORDER BY regulation DESC, semester ASC, branch ASC
    `);
    console.log('\nSubjects breakdown:');
    console.table(subCounts);

    const [studentCounts] = await connection.query(`
      SELECT current_semester, branch, section, count(*) as count 
      FROM users 
      WHERE role = 'student' 
      GROUP BY current_semester, branch, section 
      ORDER BY current_semester ASC, branch ASC, section ASC
    `);
    console.log('\nStudents enrolled breakdown:');
    console.table(studentCounts);

    const [totalStudents] = await connection.query("SELECT count(*) as count FROM users WHERE role = 'student'");
    console.log(`Total enrolled students in system: ${totalStudents[0].count}`);

    console.log('\n🎉 ALL DATA SUCCESSFULLY INGESTED AND MAPPED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Ingestion Error:', err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
