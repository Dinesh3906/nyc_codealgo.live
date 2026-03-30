
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
    // Fix current 'trial' users: set their limit to exactly 1
    const [trialRes]: any = await pool.query(
      "UPDATE `user` SET scanLimit = 1 WHERE subStatus = 'trial' AND scanLimit <> 1"
    );
    console.log(`✅ Standardized scanLimit to 1 for ${trialRes.affectedRows} users currently on the $1 offer.`);

    // Fix current 'intro' or 'pro' users: ensure their limit is a multiple of 12
    // If they have 10, it goes to 12. If they have 22 (10+12), it goes to 24.
    const [paidRes]: any = await pool.query(
      "UPDATE `user` SET scanLimit = 12 * GREATEST(introSubscriptionCount, 1) WHERE subStatus IN ('intro', 'pro') AND scanLimit % 12 <> 0"
    );
    console.log(`✅ Standardized scanLimit to multiples of 12 for ${paidRes.affectedRows} users on paid tiers.`);

  } catch (err) {
    console.error('❌ Rectifying active users failed:', err);
  } finally {
    process.exit(0);
  }
}

main();
