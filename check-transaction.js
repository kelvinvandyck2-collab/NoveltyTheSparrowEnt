const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkTransaction() {
    try {
        console.log('Checking transaction ID 105...');
        const result = await pool.query('SELECT id, receipt_number, status, created_at FROM transactions WHERE id = 105');
        console.log('Transaction details:');
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}, Receipt: ${row.receipt_number}, Status: ${row.status}, Date: ${row.created_at}`);
        });
        
        console.log('\nChecking receipt_number TRX-1775170110243...');
        const receiptResult = await pool.query('SELECT id, receipt_number, status FROM transactions WHERE receipt_number = \'TRX-1775170110243\'');
        console.log('Receipt search results:');
        receiptResult.rows.forEach(row => {
            console.log(`ID: ${row.id}, Receipt: ${row.receipt_number}, Status: ${row.status}`);
        });
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTransaction();
