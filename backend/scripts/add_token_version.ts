import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  console.log('🚀 Running database schema update for token versioning...');
  
  try {
    let connection;
    if (process.env.DATABASE_URL) {
      console.log('📡 Connecting via DATABASE_URL...');
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    } else {
      console.log('📡 Connecting via database configuration variables...');
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306)
      });
    }
    console.log('📡 Connected to Database. Adding tokenVersion column to `user` table...');

    try {
      await connection.execute('ALTER TABLE `user` ADD COLUMN `tokenVersion` INT DEFAULT 1');
      console.log('✅ Column `tokenVersion` added successfully.');
    } catch (err: any) {
      if (err.code === 'ER_DUP_COLUMN_NAME' || err.errno === 1060 || (err.message && err.message.includes('Duplicate column name'))) {
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
