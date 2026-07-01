import 'dotenv/config';
import mysql from 'mysql2/promise';

declare const process: any;

async function migrate() {
  const pool: any = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  console.log('Running role column migration...');

  try {
    // 1. Add role column to user table
    try {
      await pool.query("ALTER TABLE `user` ADD COLUMN `role` VARCHAR(50) DEFAULT 'user'");
      console.log('✅ Added role column to user table.');
    } catch (err: any) {
      console.log('ℹ️ role column already exists or ALTER failed:', err.message);
    }

    // 2. Add refreshTokenHash column to user table (for refresh token rotation reuse detection)
    try {
      await pool.query("ALTER TABLE `user` ADD COLUMN `refreshTokenHash` VARCHAR(255) NULL");
      console.log('✅ Added refreshTokenHash column to user table.');
    } catch (err: any) {
      console.log('ℹ️ refreshTokenHash column already exists or ALTER failed:', err.message);
    }

    // 3. Add/Modify adminOtp columns (for secure OTP panel verification)
    try {
      // Widen adminOtp to VARCHAR(255) for bcrypt hashes
      await pool.query("ALTER TABLE `user` MODIFY COLUMN `adminOtp` VARCHAR(255) NULL");
      console.log('✅ Modified adminOtp column to VARCHAR(255).');
    } catch (err: any) {
      // If it doesn't exist yet, we add it
      try {
        await pool.query("ALTER TABLE `user` ADD COLUMN `adminOtp` VARCHAR(255) NULL");
        console.log('✅ Added adminOtp column to user table.');
      } catch (addErr: any) {
        console.log('ℹ️ adminOtp column already exists or ALTER failed:', addErr.message);
      }
    }

    try {
      await pool.query("ALTER TABLE `user` ADD COLUMN `adminOtpExpiry` DATETIME NULL");
      console.log('✅ Added adminOtpExpiry column to user table.');
    } catch (err: any) {
      console.log('ℹ️ adminOtpExpiry column already exists or ALTER failed:', err.message);
    }

    try {
      await pool.query("ALTER TABLE `user` ADD COLUMN `adminOtpAttempts` INT DEFAULT 0");
      console.log('✅ Added adminOtpAttempts column to user table.');
    } catch (err: any) {
      console.log('ℹ️ adminOtpAttempts column already exists or ALTER failed:', err.message);
    }

    // 4. Promote initial admin emails to admin role
    const adminEmails = (process.env.INITIAL_ADMIN_EMAILS || '')
      .split(',')
      .map((email: string) => email.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length > 0) {
      await pool.query(
        `UPDATE \`user\` SET role = 'admin' WHERE email IN (${adminEmails.map(() => '?').join(',')})`,
        adminEmails
      );
    }
    console.log('✅ Promoted administrators to admin role.');

  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
  }

  await pool.end();
  console.log('Role migration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
