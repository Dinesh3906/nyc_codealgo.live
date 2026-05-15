import mysql from 'mysql2/promise';

async function updateScans() {
    const pool = mysql.createPool({
        uri: "mysql://admin:Dinesh123@nyc-algo-db.cxsiiescwamn.eu-north-1.rds.amazonaws.com:3306/nyc_algo",
    });

    try {
        const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', ['chalams115@gmail.com']);
        console.log('User found:', rows[0].email, 'current scanLimit:', rows[0].scanLimit);
        
        if (rows.length > 0) {
            await pool.query('UPDATE user SET scanLimit = scanLimit + 100 WHERE email = ?', ['chalams115@gmail.com']);
            console.log('Updated user scanLimit by +100.');
            const [rowsAfter] = await pool.query('SELECT * FROM user WHERE email = ?', ['chalams115@gmail.com']);
            console.log('User after update:', rowsAfter[0].email, 'new scanLimit:', rowsAfter[0].scanLimit);
        } else {
            console.log('User not found!');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

updateScans();
