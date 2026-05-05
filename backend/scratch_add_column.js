const mysql = require('mysql2/promise');
require('dotenv').config();

async function addImagesColumn() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    console.log('Adding images column to feedback table...');
    await connection.execute('ALTER TABLE feedback ADD COLUMN images TEXT AFTER message');
    console.log('Column added successfully.');
  } catch (err) {
    console.error('Error adding column:', err.message);
  } finally {
    await connection.end();
  }
}

addImagesColumn();
