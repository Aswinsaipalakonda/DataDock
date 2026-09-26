import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __mysql_pool: mysql.Pool | undefined;
}

const host = process.env.DB_HOST || '127.0.0.1';

const pool =
  global.__mysql_pool ||
  mysql.createPool({
    host,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'de_elearn',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    connectTimeout: 15000,
    timezone: 'Z',
    dateStrings: true,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__mysql_pool = pool;
} else if (typeof window === 'undefined') {
  try {
    require('../server/database/backup');
  } catch (e) {
    // Ignore in build phase
  }
}

// Perform safe non-destructive schema migration check
if (typeof window === 'undefined') {
  pool.getConnection().then(async (conn) => {
    try {
      const [columns]: any = await conn.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'section'"
      );
      if (Array.isArray(columns) && columns.length === 0) {
        console.log('Migrating database: Adding `section` column to `materials` table...');
        await conn.query("ALTER TABLE materials ADD COLUMN section VARCHAR(50) NOT NULL DEFAULT 'ALL' AFTER semester");
        console.log('✓ Added `section` column to `materials` table.');
      }
    } catch (err: any) {
      // Ignore during initial setup or build
    } finally {
      conn.release();
    }
  }).catch(() => {});
}

export default pool;
