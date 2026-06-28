/**
 * Migration: Add retryCount column to plan table and create dead_letter_queue table.
 * Run with: npx tsx migrations/add_production_tables.ts
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  console.log('Running production hardening migrations...');

  // 1. Add retryCount column to plan table
  try {
    await pool.query(`
      ALTER TABLE \`plan\` ADD COLUMN IF NOT EXISTS retryCount INT NOT NULL DEFAULT 0
    `);
    console.log('✅ Added retryCount column to plan table');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
      console.log('ℹ️  retryCount column already exists');
    } else {
      console.error('❌ Failed to add retryCount column:', err.message);
    }
  }

  // 2. Create dead_letter_queue table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        planId VARCHAR(255) NOT NULL,
        errorMessage TEXT NOT NULL,
        errorStack TEXT,
        attemptCount INT NOT NULL DEFAULT 0,
        lastAttemptAt DATETIME NOT NULL,
        jobPayload JSON,
        status ENUM('pending', 'retried', 'discarded') NOT NULL DEFAULT 'pending',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_dlq_status (status),
        INDEX idx_dlq_planId (planId)
      )
    `);
    console.log('✅ Created dead_letter_queue table');
  } catch (err: any) {
    console.error('❌ Failed to create dead_letter_queue table:', err.message);
  }

  // 3. Add status 'partial' to plan enum (if using ENUM type)
  try {
    await pool.query(`
      ALTER TABLE \`plan\` MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'queued'
    `);
    console.log('✅ Updated plan status column to support partial status');
  } catch (err: any) {
    console.log('ℹ️  Plan status column update:', err.message);
  }

  await pool.end();
  console.log('Migration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
