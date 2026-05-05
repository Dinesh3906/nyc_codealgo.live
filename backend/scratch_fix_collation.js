const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCollation() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    console.log('Fixing collation for feedback table...');
    // Drop and recreate or alter
    await connection.execute('ALTER TABLE feedback CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('Collation fixed successfully.');
  } catch (err) {
    console.error('Error fixing collation:', err.message);
  } finally {
    await connection.end();
  }
}

fixCollation();
