const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function reset() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306
  });

  const newPassword = 'Dinesh123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const email = 'chalams115@gmail.com';

  console.log(`Resetting password for ${email}...`);

  const [result] = await connection.execute(
    'UPDATE `user` SET password = ? WHERE email = ?',
    [hashedPassword, email]
  );

  if (result.affectedRows > 0) {
    console.log('✅ Password successfully reset to: Dinesh123');
  } else {
    console.log('❌ User not found. Checking if `user` exist...');
    const [users] = await connection.execute('SELECT email FROM `user` LIMIT 5');
    console.log('Current `user` in DB:', users.map(u => u.email));
  }

  await connection.end();
}

reset().catch(console.error);
