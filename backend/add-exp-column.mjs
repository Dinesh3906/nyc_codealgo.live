
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function addExpColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await pool.query('SHOW COLUMNS FROM `user` LIKE "subPeriodEnd"');
    if ((rows as any[]).length === 0) {
      await pool.query('ALTER TABLE `user` ADD COLUMN subPeriodEnd DATETIME DEFAULT NULL');
      console.log('Success adding subPeriodEnd');
    } else {
      console.log('Column subPeriodEnd already exists');
    }
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    process.exit(0);
  }
}

addExpColumn();
