/// <reference types="node" />
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  console.log('🚀 Starting migration to AWS RDS...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  try {
    // Connect to the server without specifying a database first
    const dbUrl = process.env.DATABASE_URL.substring(0, process.env.DATABASE_URL.lastIndexOf('/'));
    const connection = await mysql.createConnection(dbUrl);
    
    console.log('📡 Connected to RDS server. Setting up database...');

    // Create and use the target database
    await connection.query('CREATE DATABASE IF NOT EXISTS \`nyc_algo\`');
    await connection.query('USE \`nyc_algo\`');
    console.log('✅ Database nyc_algo ready.');

    // 1. User Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`user\` (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'architect',
        subStatus VARCHAR(50) DEFAULT 'free',
        scanLimit INT DEFAULT 0,
        subPeriodEnd DATETIME,
        introSubscriptionCount INT DEFAULT 0,
        trialClaimed BOOLEAN DEFAULT FALSE,
        lastHandledSessionId VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ User table ready.');

    // Add missing columns if they don't exist (Fix for existing tables)
    try {
      await connection.query('ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS subPeriodEnd DATETIME');
      await connection.query('ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS introSubscriptionCount INT DEFAULT 0');
      await connection.query('ALTER TABLE \`user\` ADD COLUMN IF NOT EXISTS trialClaimed BOOLEAN DEFAULT FALSE');
      console.log('✅ User table columns updated.');
    } catch (e) {
      // Ignore if columns already exist
    }

    // 2. Plan Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`plan\` (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileUrl VARCHAR(255),
        status VARCHAR(50) DEFAULT 'processing',
        analysisResult LONGTEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES \`user\`(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Plan table ready.');

    // 3. Feedback Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`feedback\` (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        type VARCHAR(50),
        subject VARCHAR(255),
        message TEXT,
        images TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES \`user\`(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Feedback table ready.');

    console.log('🎉 Migration completed successfully!');
    await connection.end();
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
  }
}

migrate();
