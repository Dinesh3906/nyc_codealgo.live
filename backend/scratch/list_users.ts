import dotenv from 'dotenv';
dotenv.config();
import pool from '../src/db';

async function listUsers() {
  try {
    const [rows]: any = await pool.query('SELECT id, email, name, subStatus, scanLimit, pagesUsed FROM user');
    console.log('USERS IN DB:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listUsers();
