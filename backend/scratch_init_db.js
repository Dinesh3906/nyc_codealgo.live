const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDb() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    console.log('Attempting to create table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        type VARCHAR(50),
        subject VARCHAR(255),
        message TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table created successfully or already exists.');
  } catch (err) {
    console.error('CRITICAL ERROR creating table:', err.message);
  } finally {
    await connection.end();
  }
}

initDb();
