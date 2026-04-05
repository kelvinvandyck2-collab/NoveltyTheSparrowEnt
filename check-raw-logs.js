const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkRawReturnLogs() {
    try {
        console.log('Checking raw RETURN_SALE entries in database...');
        const res = await pool.query(`
            SELECT action, details, created_at 
            FROM activity_logs
            WHERE action = 'RETURN_SALE'
            ORDER BY created_at DESC 
            LIMIT 3
        `);

        if (res.rows.length === 0) {
            console.log('No RETURN_SALE entries found.');
        } else {
            console.log(`Found ${res.rows.length} RETURN_SALE entries:`);
            res.rows.forEach(log => {
                console.log(`\nDate: ${log.created_at}`);
                console.log(`Action: ${log.action}`);
                console.log(`Details type: ${typeof log.details}`);
                console.log(`Details value: ${log.details}`);
                
                if (typeof log.details === 'string') {
                    try {
                        const parsed = JSON.parse(log.details);
                        console.log(`Parsed details:`, parsed);
                    } catch (e) {
                        console.log(`Failed to parse as JSON: ${e.message}`);
                    }
                }
                console.log('---');
            });
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkRawReturnLogs();
