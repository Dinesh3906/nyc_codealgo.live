
import 'dotenv/config';
import pool from '../src/db';

async function main() {
  try {
    const [rows]: any = await pool.query('SHOW TABLES');
    console.log('Tables:', rows.map((r: any) => Object.values(r)[0]));
  } catch (err) {
    console.error('Failed to list tables:', err);
  } finally {
    process.exit(0);
  }
}

main();
