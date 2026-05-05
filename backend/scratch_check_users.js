const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [users] = await connection.execute('SELECT email, subStatus, scanLimit FROM user LIMIT 5');
    console.log('Users in DB:', users);
  } catch (err) {
    console.error('Error checking users:', err.message);
  } finally {
    await connection.end();
  }
}

checkUsers();
