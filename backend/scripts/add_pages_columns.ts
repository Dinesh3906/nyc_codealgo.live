import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
  console.log('🚀 Running database schema update for page-based billing columns...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('📡 Connected to MySQL database.');

    // 1. Add pagesUsed to user table
    try {
      console.log("Adding column 'pagesUsed' to 'user' table...");
      await connection.query('ALTER TABLE `user` ADD COLUMN `pagesUsed` INT DEFAULT 0 AFTER `scanLimit`');
      console.log("✅ Column 'pagesUsed' added successfully.");
    } catch (err: any) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log("ℹ️ Column 'pagesUsed' already exists. Skipping.");
      } else {
        console.error("❌ Error adding column 'pagesUsed':", err.message);
      }
    }

    // 2. Add pages to plan table
    try {
      console.log("Adding column 'pages' to 'plan' table...");
      await connection.query('ALTER TABLE `plan` ADD COLUMN `pages` INT DEFAULT 1 AFTER `status`');
      console.log("✅ Column 'pages' added successfully.");
    } catch (err: any) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log("ℹ️ Column 'pages' already exists. Skipping.");
      } else {
        console.error("❌ Error adding column 'pages':", err.message);
      }
    }

    console.log('🎉 Database schema updated successfully!');
    await connection.end();
  } catch (error: any) {
    console.error('❌ Schema update failed:', error.message);
  }
}

run();
