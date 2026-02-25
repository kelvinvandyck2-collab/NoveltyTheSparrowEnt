const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTransactions() {
    try {
        console.log('Checking transactions for Kelvin (ID 10)...\n');

        // Get customer info
        const customer = await pool.query('SELECT id, name, current_balance FROM customers WHERE id = 10');
        console.log('Customer:', customer.rows[0]);

        // Get all transactions for this customer
        const transactions = await pool.query(`
            SELECT id, created_at, receipt_number, total_amount, status, customer_id
            FROM transactions 
            WHERE customer_id = 10
            ORDER BY created_at DESC
        `);
        console.log('\nAll transactions for customer 10:');
        transactions.rows.forEach(t => {
            console.log(`  ID: ${t.id}, Date: ${t.created_at}, Amount: ${t.total_amount}, Status: ${t.status}`);
        });

        // Get transactions for January 2026
        const januaryTxns = await pool.query(`
            SELECT id, created_at::date as date, receipt_number, total_amount, status
            FROM transactions 
            WHERE customer_id = 10
            AND created_at >= '2026-01-01' AND created_at < '2026-02-01'
            ORDER BY created_at DESC
        `);
        console.log('\nTransactions for January 2026:');
        console.log(`Count: ${januaryTxns.rows.length}`);
        januaryTxns.rows.forEach(t => {
            console.log(`  Date: ${t.date}, Amount: ${t.total_amount}`);
        });

        // Get customer payments
        const payments = await pool.query(`
            SELECT id, payment_date, amount
            FROM customer_payments 
            WHERE customer_id = 10
            ORDER BY payment_date DESC
        `);
        console.log('\nPayments:');
        console.log(`Count: ${payments.rows.length}`);
        payments.rows.forEach(p => {
            console.log(`  Date: ${p.payment_date}, Amount: ${p.amount}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkTransactions();
