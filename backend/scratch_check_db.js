import mysql from 'mysql2/promise';

async function checkDb() {
    const pool = mysql.createPool({
        uri: "mysql://admin:Dinesh123@nyc-algo-db.cxsiiescwamn.eu-north-1.rds.amazonaws.com:3306/nyc_algo",
    });

    try {
        const [plans] = await pool.query('SELECT id, status, analysisResult, createdAt FROM plan ORDER BY createdAt DESC LIMIT 10');
        for (const p of plans) {
            console.log(`Plan ID: ${p.id} | Status: ${p.status} | CreatedAt: ${p.createdAt}`);
            console.log(`Raw Result: ${typeof p.analysisResult} -`, JSON.stringify(p.analysisResult).substring(0, 100));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkDb();
