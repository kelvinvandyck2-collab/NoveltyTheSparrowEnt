const { Pool } = require('pg');
require('dotenv').config();

// Use same config as server.js
const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkReceipts() {
    try {
        console.log('Checking recent receipts...');
        const result = await pool.query('SELECT id, receipt_number, created_at FROM transactions WHERE receipt_number IS NOT NULL ORDER BY created_at DESC LIMIT 10');
        console.log('Recent receipts in database:');
        result.rows.forEach(row => {
            console.log(`ID: ${row.id}, Receipt: ${row.receipt_number}, Date: ${row.created_at}`);
        });
        
        console.log('\nChecking for receipts containing 1775170110243...');
        const specific = await pool.query('SELECT id, receipt_number FROM transactions WHERE receipt_number LIKE \'%1775170110243%\'');
        console.log('Receipts containing 1775170110243:');
        specific.rows.forEach(row => {
            console.log(`ID: ${row.id}, Receipt: ${row.receipt_number}`);
        });
        
        console.log('\nChecking all TRX receipts...');
        const trxReceipts = await pool.query('SELECT id, receipt_number FROM transactions WHERE receipt_number LIKE \'TRX-%\' ORDER BY created_at DESC LIMIT 5');
        console.log('Recent TRX receipts:');
        trxReceipts.rows.forEach(row => {
            console.log(`ID: ${row.id}, Receipt: ${row.receipt_number}`);
        });
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkReceipts();
