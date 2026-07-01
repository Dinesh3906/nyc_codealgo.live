import 'dotenv/config';
import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
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

    // 3. Promote initial admin emails to admin role
    const adminEmails = (process.env.INITIAL_ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
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
