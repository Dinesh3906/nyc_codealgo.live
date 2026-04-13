
import 'dotenv/config';
import pool from '../src/db';

async function main() {
  try {
    const [users]: any = await pool.query('SELECT id, subStatus, scanLimit, subPeriodEnd FROM `user`');
    console.log('Current users:', users);
    
    // Retroactive update: 10 -> 12
    const [updateResult]: any = await pool.query(
      'UPDATE `user` SET scanLimit = 12 WHERE scanLimit = 10'
    );
    console.log(`✅ Updated ${updateResult.affectedRows} users from 10 to 12 scans`);

    // Retroactive update: null subPeriodEnd for active plans
    const [expiryResult]: any = await pool.query(
      "UPDATE `user` SET subPeriodEnd = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE subPeriodEnd IS NULL AND subStatus IN ('intro', 'pro', 'trial')"
    );
    console.log(`✅ Set default 30-day expiry for ${expiryResult.affectedRows} users with active plans`);

  } catch (err) {
    console.error('❌ Data update failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
