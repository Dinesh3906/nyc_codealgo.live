import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
  console.log('🚀 Running database schema update for admin database panel fields...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('📡 Connected to AWS RDS MySQL. Adding columns to `user` table...');

    const columns = [
      { name: 'provider', type: "VARCHAR(50) DEFAULT 'email'" },
      { name: 'adminOtp', type: 'VARCHAR(6) NULL' },
      { name: 'adminOtpExpiry', type: 'DATETIME NULL' }
    ];

    for (const col of columns) {
      try {
        console.log(`Adding column '${col.name}'...`);
        await connection.query(`ALTER TABLE \`user\` ADD COLUMN \`${col.name}\` ${col.type}`);
        console.log(`✅ Column '${col.name}' added/verified successfully.`);
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
