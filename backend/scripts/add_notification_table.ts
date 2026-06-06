import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
  console.log('🚀 Running database schema update for web notifications...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('📡 Connected to AWS RDS MySQL. Creating `notification` table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`notification\` (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES \`user\`(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    console.log('✅ Notification table ready.');
    await connection.end();
  } catch (error: any) {
    console.error('❌ Schema update failed:', error.message);
  }
}

run();
