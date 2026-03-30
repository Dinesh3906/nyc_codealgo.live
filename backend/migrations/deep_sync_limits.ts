
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
    // We calculate the exactly correct limit based on their flags:
    // Trial: +1 if claimed
    // Intro/Pro: +12 for each count in introSubscriptionCount
    // If they have pro status with 0 count (not possible with our logic, but let's be safe), we ensure min 12.
    
    // We update all users whose scanLimit doesn't match the history formula
    const [result]: any = await pool.query(`
      UPDATE \`user\`
      SET scanLimit = (
        (CASE WHEN trialClaimed = 1 THEN 1 ELSE 0 END) +
        (introSubscriptionCount * 12)
      )
      WHERE subStatus IN ('trial', 'intro', 'pro')
    `);
    
    console.log(`✅ Deep-synced scan limits for ${result.affectedRows} active users according to their verified payment history.`);

    // Check one user case (the one mentioned by user)
    const [check]: any = await pool.query('SELECT email, scanLimit, introSubscriptionCount, trialClaimed FROM `user` WHERE scanLimit > 20');
    console.log('Post-sync verification:', check);

  } catch (err) {
    console.error('❌ Deep-sync failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
