const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixQuota() {
  const pool = process.env.DATABASE_URL
    ? mysql.createPool({ uri: process.env.DATABASE_URL })
    : mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
      });

  console.log("--- NYC QUOTA INTEGRITY SCAN ---");
  
  try {
    // 1. Identify "Stuck" processing scans (older than 30 mins)
    const [stuck] = await pool.query(
      "SELECT id, fileName, createdAt FROM `plan` WHERE status = 'processing' AND createdAt < NOW() - INTERVAL 30 MINUTE"
    );

    if (stuck.length === 0) {
      console.log("✅ No stuck scans found. All 'processing' scans are fresh.");
    } else {
      console.log(`⚠️ Found ${stuck.length} stuck scans. Resetting to 'failed'...`);
      for (const plan of stuck) {
        console.log(`   - Resetting: ${plan.fileName} (${plan.id})`);
        await pool.query("UPDATE `plan` SET status = 'failed' WHERE id = ?", [plan.id]);
      }
      console.log("✅ Stuck scans have been released. User credits are now safe.");
    }

    // 2. Summary of current state
    const [counts] = await pool.query(
      "SELECT status, COUNT(*) as count FROM `plan` GROUP BY status"
    );
    console.log("\n--- CURRENT SYSTEM STATE ---");
    counts.forEach((c) => console.log(`${c.status.toUpperCase()}: ${c.count}`));

  } catch (err) {
    console.error("❌ Error during quota fix:", err);
  } finally {
    await pool.end();
  }
}

fixQuota();
