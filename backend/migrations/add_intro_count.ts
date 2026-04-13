
import 'dotenv/config';
import pool from '../src/db';

async function main() {
  try {
    const [rows]: any = await pool.query('SHOW COLUMNS FROM `user` LIKE "introSubscriptionCount"');
    if (rows.length === 0) {
      await pool.query('ALTER TABLE `user` ADD COLUMN introSubscriptionCount INT DEFAULT 0');
      console.log('✅ Added introSubscriptionCount column successfully');
    } else {
      console.log('ℹ️ introSubscriptionCount column already exists');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
