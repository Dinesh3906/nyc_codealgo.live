/// <reference types="node" />
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
  console.log('🚀 Running database schema update for queue management...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('📡 Connected to AWS RDS MySQL. Adding columns to `plan` table...');

    const columns = [
      { name: 'mimetype', type: 'VARCHAR(100) NULL' },
      { name: 'selectedSteps', type: 'TEXT NULL' }
    ];

    for (const col of columns) {
      try {
        console.log(`Adding column '${col.name}'...`);
        await connection.execute(`ALTER TABLE \`plan\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`✅ Column '${col.name}' added successfully.`);
      } catch (err: any) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`ℹ️ Column '${col.name}' already exists. Skipping.`);
        } else {
          console.error(`❌ Error adding column '${col.name}':`, err.message);
        }
      }
    }

    console.log('🎉 Database schema updated successfully!');
    await connection.end();
  } catch (error: any) {
    console.error('❌ Schema update failed:', error.message);
  }
}

run();
