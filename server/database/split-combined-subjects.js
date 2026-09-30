require('dotenv').config();
const mysql = require('mysql2/promise');
const r24Subjects = require('../../lib/data/r24-subjects.json');

const r23HonorsSubjects = [
  { code: 'R23MSCSHT09', title: 'HON-1: Information Security and Forensics', branch: 'CIC', semester: 6, regulation: 'R23' },
  { code: 'R23MSCSHT10', title: 'HON-1: Routing and Switching Applications', branch: 'CIC', semester: 6, regulation: 'R23' },
  { code: 'R23MSCSHT11', title: 'HON-2: Penetration Testing', branch: 'CIC', semester: 6, regulation: 'R23' },
  { code: 'R23MSCSHT12', title: 'HON-2: Network Security, Firewalls and VPNs', branch: 'CIC', semester: 6, regulation: 'R23' },
  { code: 'R23MSCSHT13', title: 'HON-3: Information Security Governance and Compliance Standards', branch: 'CIC', semester: 7, regulation: 'R23' },
  { code: 'R23MSCSHT14', title: 'HON-3: Protocol Stacks', branch: 'CIC', semester: 7, regulation: 'R23' },
];

async function splitCombinedSubjects() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'de_elearn',
  });

  console.log('=== Step 1: Connecting to MySQL Database ===');
  console.log(`Connected to database "${process.env.DB_NAME || 'de_elearn'}" at ${process.env.DB_HOST || '127.0.0.1'}`);

  try {
    // 1. Insert all clean decomposed R24 subjects
    console.log('\n=== Step 2: Ingesting Decomposed R24 Curriculum Subjects ===');
    let insertedR24 = 0;
    for (const sub of r24Subjects) {
      await connection.query(
        `INSERT INTO subjects (code, title, branch, semester, regulation, active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE title = VALUES(title), semester = VALUES(semester), active = 1`,
        [sub.code, sub.title, sub.branch, sub.semester, sub.regulation]
      );
      insertedR24++;
    }
    console.log(`✓ Inserted/Updated ${insertedR24} decomposed R24 subjects.`);

    // 2. Insert clean decomposed R23 Honors subjects
    console.log('\n=== Step 3: Ingesting Decomposed R23 Honors Subjects ===');
    let insertedR23 = 0;
    for (const sub of r23HonorsSubjects) {
      await connection.query(
        `INSERT INTO subjects (code, title, branch, semester, regulation, active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE title = VALUES(title), semester = VALUES(semester), active = 1`,
        [sub.code, sub.title, sub.branch, sub.semester, sub.regulation]
      );
      insertedR23++;
    }
    console.log(`✓ Inserted/Updated ${insertedR23} decomposed R23 Honors subjects.`);

    // 3. Define legacy mapping to safely migrate existing materials and allocations without data loss
    const legacyMappings = [
      {
        oldCodeLike: '%R24MBMCL001%',
        newPrimaryCode: 'R24MBMCL001',
      },
      {
        oldCodeLike: '%R24MBMCT001%',
        newPrimaryCode: 'R24MBMCT001',
      },
      {
        oldCodeLike: '%R24MBMCT002%',
        newPrimaryCode: 'R24MBMCT002',
      },
      {
        oldCodeLike: '%R24MBMCL003%R24MIACL003%',
        newPrimaryCode: 'R24MBMCL003',
      },
      {
        oldCodeLike: '%R24MBMCT005%R24MIACT005%',
        newPrimaryCode: 'R24MBMCT005',
      },
      {
        oldCodeLike: '%R23MSCSHT09%',
        newPrimaryCode: 'R23MSCSHT09',
      },
      {
        oldCodeLike: '%R23MSCSHT11%',
        newPrimaryCode: 'R23MSCSHT11',
      },
      {
        oldCodeLike: '%R23MSCSHT13%',
        newPrimaryCode: 'R23MSCSHT13',
      },
    ];

    console.log('\n=== Step 4: Migrating Existing Materials & Allocations (Zero Data Loss) ===');
    for (const map of legacyMappings) {
      const [matUpdate] = await connection.query(
        'UPDATE materials SET subject = ? WHERE subject LIKE ?',
        [map.newPrimaryCode, map.oldCodeLike]
      );
      if (matUpdate.affectedRows > 0) {
        console.log(`✓ Migrated ${matUpdate.affectedRows} material(s) from "${map.oldCodeLike}" to "${map.newPrimaryCode}".`);
      }

      // If faculty_subject_allocations table exists, migrate it too
      try {
        const [allocUpdate] = await connection.query(
          'UPDATE faculty_subject_allocations SET subject_code = ? WHERE subject_code LIKE ?',
          [map.newPrimaryCode, map.oldCodeLike]
        );
        if (allocUpdate.affectedRows > 0) {
          console.log(`✓ Migrated ${allocUpdate.affectedRows} faculty allocation(s) from "${map.oldCodeLike}" to "${map.newPrimaryCode}".`);
        }
      } catch (e) {
        // Table might not exist in all environments
      }
    }

    // 4. Safely cleanup remaining slash subjects from subjects table
    console.log('\n=== Step 5: Cleaning Up Obsolete Merged Rows ===');
    const [deletedRows] = await connection.query(
      "DELETE FROM subjects WHERE code LIKE '%/%'"
    );
    console.log(`✓ Removed ${deletedRows.affectedRows} obsolete merged subject row(s).`);

    // 5. Verify total count
    const [subjectCount] = await connection.query('SELECT COUNT(*) as count FROM subjects WHERE active = 1');
    console.log(`\n🎉 Migration completed successfully! Total active subjects in database: ${subjectCount[0].count}`);
  } catch (err) {
    console.error('❌ Migration failed with error:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

splitCombinedSubjects();
