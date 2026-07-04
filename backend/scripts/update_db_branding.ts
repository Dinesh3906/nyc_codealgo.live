import mysql from 'mysql2/promise';
import 'dotenv/config';

async function run() {
  console.log('🚀 Connecting to database to update branding in notifications...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('📡 Connected to AWS RDS MySQL.');

    const variations = [
      { search: 'CodeAnalog', replace: 'PermitIQ by Aureon' },
      { search: 'codeanalog', replace: 'PermitIQ by Aureon' },
      { search: 'Code Analog', replace: 'PermitIQ by Aureon' },
      { search: 'code analog', replace: 'PermitIQ by Aureon' }
    ];

    let totalUpdated = 0;

    for (const variation of variations) {
      // Update message column
      const [msgResult]: any = await connection.query(`
        UPDATE \`notification\` 
        SET message = REPLACE(message, ?, ?) 
        WHERE message LIKE ?;
      `, [variation.search, variation.replace, `%${variation.search}%`]);
      
      // Update title column
      const [titleResult]: any = await connection.query(`
        UPDATE \`notification\` 
        SET title = REPLACE(title, ?, ?) 
        WHERE title LIKE ?;
      `, [variation.search, variation.replace, `%${variation.search}%`]);

      const affected = (msgResult.affectedRows || 0) + (titleResult.affectedRows || 0);
      totalUpdated += affected;
      
      if (affected > 0) {
        console.log(`✅ Updated ${affected} rows for variation: "${variation.search}" -> "${variation.replace}"`);
      }
    }

    console.log(`🎉 Branding update completed. Total modifications: ${totalUpdated}`);
    await connection.end();
  } catch (error: any) {
    console.error('❌ Database update failed:', error.message);
  }
}

run();
