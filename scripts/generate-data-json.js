const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');

// 1. Parse Subjects
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

const subjects = [];
const subjectCodeSet = new Set();

for (const sf of subjectFiles) {
  const filePath = path.join(DATA_DIR, sf.file);
  const wb = XLSX.readFile(filePath);

  for (const sheetName of sf.sheets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].some(c => String(c).includes('SUBJECT_CODE') || String(c).includes('SUBJECT_\r\nCODE') || String(c).includes('SUBJECT'))) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) continue;
    const targetBranch = branchMapping[sheetName] || sheetName;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 8) continue;

      const degree = String(r[0] || '').trim().toUpperCase();
      const codeVal = String(r[6] || '').trim();

      if (degree !== 'B.TECH' || !codeVal.includes('R24')) continue;

      const code = codeVal.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
      const title = String(r[7] || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
      const sem = parseInt(r[4] || sf.sem, 10);
      const reg = String(r[2] || 'R24').trim();

      if (!code || !title) continue;

      const key = `${code}_${targetBranch}_${sem}_${reg}`;
      if (!subjectCodeSet.has(key)) {
        subjectCodeSet.add(key);
        subjects.push({ code, title, branch: targetBranch, semester: sem, regulation: reg });
      }
    }
  }
}

console.log(`Parsed ${subjects.length} unique R24 subject definitions.`);

// 2. Parse Student Rosters
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

const students = [];
const rollSet = new Set();

for (const sc of studentConfigs) {
  const filePath = path.join(DATA_DIR, sc.file);
  const wb = XLSX.readFile(filePath);

  for (const sheetDef of sc.sheets) {
    const sheet = wb.Sheets[sheetDef.name];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const r = rows[rIdx];
      if (!r || !Array.isArray(r)) continue;

      for (let c = 0; c < r.length; c++) {
        const val = String(r[c] || '').trim().toUpperCase();
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
            students.push({
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
  }
}

console.log(`Parsed ${students.length} unique student records.`);

const outDir = path.join(__dirname, '..', 'lib', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'r24-subjects.json'), JSON.stringify(subjects, null, 2));
fs.writeFileSync(path.join(outDir, 'student-roster.json'), JSON.stringify(students, null, 2));
console.log(`✓ Saved pre-parsed JSON to ${outDir}/r24-subjects.json and student-roster.json`);
