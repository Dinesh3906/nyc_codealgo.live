/// <reference types="node" />
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
  console.log('🚀 Running database schema update for token versioning...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection(dbUrl);
    console.log('📡 Connected to Database. Adding tokenVersion column to `user` table...');

    try {
      await connection.execute('ALTER TABLE `user` ADD COLUMN `tokenVersion` INT DEFAULT 1');
      console.log('✅ Column `tokenVersion` added successfully.');
    } catch (err: any) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log('ℹ️ Column `tokenVersion` already exists. Skipping.');
      } else {
        console.error('❌ Error adding column:', err.message);
        throw err;
      }
    }

    await connection.end();
    console.log('🎉 Database schema updated successfully!');
  } catch (error: any) {
    console.error('❌ Schema update failed:', error.message);
    process.exit(1);
  }
}

run();
