
import pool from '../src/db';
import 'dotenv/config';

async function main() {
  const [users]: any = await pool.query('SELECT email, subStatus, scanLimit FROM `user`');
  console.log('All Users Status:', users);
  process.exit(0);
}

main();
