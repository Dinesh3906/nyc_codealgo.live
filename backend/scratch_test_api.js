import mysql from 'mysql2/promise';

async function testPlansRoute() {
    const pool = mysql.createPool({
        uri: "mysql://admin:Dinesh123@nyc-algo-db.cxsiiescwamn.eu-north-1.rds.amazonaws.com:3306/nyc_algo",
    });

    try {
        const [plans] = await pool.query(
            "SELECT id, fileName, status, analysisResult, createdAt FROM `plan` ORDER BY createdAt DESC LIMIT 3"
        );
        
        const parsedPlans = plans.map((p) => {
            let result = p.analysisResult;
            let depth = 0;
            while (typeof result === 'string' && depth < 3) {
                try { result = JSON.parse(result); } catch(e) { break; }
                depth++;
            }
            if (typeof result !== 'object' || result === null) result = {};
            return { ...p, analysisResult: result };
        });

        console.log(JSON.stringify(parsedPlans, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

testPlansRoute();
