const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDb() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.execute('SELECT * FROM feedback');
    console.log('Feedbacks in DB:', rows);
  } catch (err) {
    console.error('Error checking DB:', err.message);
  } finally {
    await connection.end();
  }
}

checkDb();
