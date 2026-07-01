import 'dotenv/config';
import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  console.log('Running feedback table migration...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`feedback\` (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        type VARCHAR(50),
        subject VARCHAR(255),
        message TEXT,
        images TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES \`user\`(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Feedback table ready.');
  } catch (err: any) {
    console.error('❌ Failed to verify/create feedback table:', err.message);
  }

  await pool.end();
  console.log('Feedback migration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
