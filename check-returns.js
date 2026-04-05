const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkReturns() {
    try {
        console.log('Checking for return transactions...');
        const returnRes = await pool.query('SELECT id, receipt_number, is_return, created_at FROM transactions WHERE is_return = TRUE ORDER BY created_at DESC LIMIT 10');
        console.log('Return transactions found:', returnRes.rows.length);
        returnRes.rows.forEach(row => {
            console.log(`ID: ${row.id}, Receipt: ${row.receipt_number}, Date: ${row.created_at}`);
        });
        
        console.log('\nChecking activity logs for RETURN_SALE...');
        const activityRes = await pool.query("SELECT action, details, created_at FROM activity_logs WHERE action LIKE '%RETURN%' ORDER BY created_at DESC LIMIT 10");
        console.log('RETURN activities found:', activityRes.rows.length);
        activityRes.rows.forEach(row => {
            console.log(`Action: ${row.action}, Date: ${row.created_at}, Details: ${row.details}`);
        });
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkReturns();
