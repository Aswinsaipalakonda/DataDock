require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'de_elearn',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z',
  dateStrings: true,
});

pool.getConnection()
  .then(async (conn) => {
    console.log('✓ MySQL connection pool established successfully.');
    try {
      const [columns] = await conn.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'section'"
      );
      if (columns.length === 0) {
        console.log('Migrating database: Adding `section` column to `materials` table...');
        await conn.query("ALTER TABLE materials ADD COLUMN section VARCHAR(50) NOT NULL DEFAULT 'ALL' AFTER semester");
        console.log('✓ Added `section` column to `materials` table.');
      }
    } catch (migErr) {
      console.warn('Auto-migration warning:', migErr.message);
    }
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MySQL database:', err.message);
  });

module.exports = pool;
