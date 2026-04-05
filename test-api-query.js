const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function testAPIQuery() {
    try {
        console.log('Testing the exact query the API uses...');
        
        // Test with TRX-1775170110243
        const result1 = await pool.query(`
            SELECT t.*, u.name AS cashier_name, u.store_id, c.name AS customer_name, c.current_balance, c.credit_limit
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE t.receipt_number = $1 AND t.status = 'completed'
        `, ['TRX-1775170110243']);
        
        console.log(`Query with 'TRX-1775170110243': ${result1.rows.length} results`);
        if (result1.rows.length > 0) {
            console.log('Found:', result1.rows[0].receipt_number);
        }
        
        // Test with RCPTRX-1775170110243
        const result2 = await pool.query(`
            SELECT t.*, u.name AS cashier_name, u.store_id, c.name AS customer_name, c.current_balance, c.credit_limit
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE t.receipt_number = $1 AND t.status = 'completed'
        `, ['RCPTRX-1775170110243']);
        
        console.log(`Query with 'RCPTRX-1775170110243': ${result2.rows.length} results`);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

testAPIQuery();
