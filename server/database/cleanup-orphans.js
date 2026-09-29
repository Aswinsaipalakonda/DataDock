require('dotenv').config({ path: '.env.local' });
if (!process.env.DB_HOST) require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'de_elearn',
    });
    console.log('Connected to local DB');
    const [res] = await conn.query("DELETE FROM users WHERE roll_number IN ('25331A4249', '25331A4739') AND role = 'student'");
    console.log('Local DB deleted affectedRows:', res.affectedRows);
    const [countCSMA] = await conn.query("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND current_semester = 3 AND branch = 'CSM' AND section = 'A'");
    console.log('Local DB Sem 3 CSM A count:', countCSMA[0].c);
    const [countCICA] = await conn.query("SELECT COUNT(*) as c FROM users WHERE role = 'student' AND current_semester = 3 AND branch = 'CIC' AND section = 'A'");
    console.log('Local DB Sem 3 CIC A count:', countCICA[0].c);
    await conn.end();
  } catch (e) {
    console.log('Local DB note:', e.message);
  }
}
run();
