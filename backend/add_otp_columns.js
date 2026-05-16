const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'nyc-algo-db.cxsiiescwamn.eu-north-1.rds.amazonaws.com',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASS || 'Dinesh123',
    database: process.env.DB_NAME || 'nyc_algo'
  });

  try {
    console.log('Adding resetOtp and resetOtpExpiry columns to user table...');
    
    // Check if columns already exist
    const [columns] = await connection.query('SHOW COLUMNS FROM `user`');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('resetOtp')) {
      await connection.query('ALTER TABLE `user` ADD COLUMN resetOtp VARCHAR(6) DEFAULT NULL');
      console.log('Added resetOtp column.');
    } else {
      console.log('resetOtp column already exists.');
    }

    if (!columnNames.includes('resetOtpExpiry')) {
      await connection.query('ALTER TABLE `user` ADD COLUMN resetOtpExpiry DATETIME DEFAULT NULL');
      console.log('Added resetOtpExpiry column.');
    } else {
      console.log('resetOtpExpiry column already exists.');
    }

    console.log('Database update successful.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await connection.end();
  }
}

addColumns();
