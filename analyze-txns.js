const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function analyzeTransactions() {
    try {
        console.log('Analyzing all transactions in the system...\n');

        // Get summary
        const summary = await pool.query(`
            SELECT 
                COUNT(*) as total_txns,
                COUNT(DISTINCT customer_id) as customers_with_txns,
                COUNT(*) FILTER (WHERE customer_id IS NULL) as txns_without_customer,
                SUM(total_amount) as total_sales
            FROM transactions
        `);
        console.log('Summary:');
        console.log(summary.rows[0]);

        // Get all transactions with their customer info
        const txns = await pool.query(`
            SELECT 
                t.id, 
                t.created_at::date as date,
                t.customer_id,
                c.name as customer_name,
                t.total_amount,
                t.status,
                t.receipt_number
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            ORDER BY t.created_at DESC
            LIMIT 20
        `);
        
        console.log('\nLatest 20 transactions:');
        txns.rows.forEach(t => {
            console.log(`  ID: ${t.id}, Date: ${t.date}, Customer: ${t.customer_name || 'NULL'} (ID: ${t.customer_id}), Amount: ${t.total_amount}, Status: ${t.status}`);
        });

        // Find what's creating the 164.64 balance
        const balanceSum = await pool.query(`
            SELECT 
                SUM(CASE WHEN customer_id = 10 THEN total_amount ELSE 0 END) as total_for_customer_10,
                SUM(CASE WHEN customer_id IS NULL THEN total_amount ELSE 0 END) as total_for_null_customer
            FROM transactions
            WHERE status = 'completed'
        `);
        console.log('\nBalance analysis:');
        console.log(balanceSum.rows[0]);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

analyzeTransactions();
