
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [result]: any = await pool.query(
      "UPDATE `user` SET scanLimit = 0 WHERE subStatus = 'free' AND scanLimit > 0"
    );
    console.log(`✅ Set scanLimit to 0 for ${result.affectedRows} existing 'free' users.`);
  } catch (err) {
    console.error('❌ Resetting free users failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
