import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function fixUserSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 4000,
    ssl: { rejectUnauthorized: false }
  });

  const columns = [
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS isVerified TINYINT(1) DEFAULT 0",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local'",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS tokenVersion INT DEFAULT 0",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS refreshTokenHash VARCHAR(255) NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS pagesUsed INT DEFAULT 0",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS emailOtp VARCHAR(255) NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS emailOtpExpiry DATETIME NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS resetOtp VARCHAR(255) NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS resetOtpExpiry DATETIME NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS otpAttempts INT DEFAULT 0",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS dob VARCHAR(50) NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS adminOtp VARCHAR(255) NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS adminOtpExpiry DATETIME NULL",
    "ALTER TABLE `user` ADD COLUMN IF NOT EXISTS adminOtpAttempts INT DEFAULT 0"
  ];

  console.log('Migrating user table schema in TiDB...');
  for (const sql of columns) {
    try {
      await pool.query(sql);
      console.log('✅ Executed:', sql);
    } catch (err: any) {
      console.log('ℹ️  Result for:', sql, err.message);
    }
  }

  const [res]: any = await pool.query('DESCRIBE `user`');
  console.log('\nAll Columns in user table:');
  console.log(res.map((r: any) => `${r.Field} (${r.Type})`));

  await pool.end();
}

fixUserSchema().catch(console.error);
