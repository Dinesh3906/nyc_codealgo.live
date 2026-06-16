import dotenv from 'dotenv';
import path from 'path';

// Load dotenv from backend folder
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

import pool from '../../../backend/src/db';

async function main() {
  try {
    const [rows]: any = await pool.query('SELECT id, fileName, status, createdAt FROM plan ORDER BY createdAt DESC LIMIT 5');
    console.log("Plans in database:");
    console.log(JSON.stringify(rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error("Error connecting/querying DB:", err);
  }
}

main();
