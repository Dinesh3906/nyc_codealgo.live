
import 'dotenv/config';
import pool from '../src/db';

async function main() {
  try {
    const [rows]: any = await pool.query('SHOW COLUMNS FROM `user` LIKE "subPeriodEnd"');
    if (rows.length === 0) {
      await pool.query('ALTER TABLE `user` ADD COLUMN subPeriodEnd DATETIME DEFAULT NULL');
      console.log('✅ Added subPeriodEnd column successfully');
    } else {
      console.log('ℹ️ subPeriodEnd column already exists');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
