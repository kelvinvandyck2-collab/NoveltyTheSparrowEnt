const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createSampleTransactions() {
    try {
        console.log('Creating sample transactions for Kelvin Van-Dyck (ID 10)...\n');

        // Create 3 sample transactions in January 2026
        const dates = [
            '2026-01-05',
            '2026-01-12',
            '2026-01-20'
        ];
        
        const amounts = [50.00, 60.64, 54.00];
        
        for (let i = 0; i < dates.length; i++) {
            const result = await pool.query(`
                INSERT INTO transactions 
                (user_id, store_location, total_amount, payment_method, receipt_number, items, customer_id, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)
                RETURNING id
            `, [
                1, // user_id (admin)
                'Main Store',
                amounts[i],
                'cash', // payment_method
                'RCP' + Math.random().toString(36).substring(7),
                JSON.stringify([
                    { barcode: '123456', name: 'Test Item', qty: 1, price: amounts[i], discount: 0 }
                ]),
                10, // customer_id = Kelvin
                dates[i] // created_at
            ]);
            console.log(`✓ Created transaction ${i+1}: ${dates[i]} - GHS ${amounts[i]} (ID: ${result.rows[0].id})`);
        }

        // Create 1 payment in January
        await pool.query(`
            INSERT INTO customer_payments (customer_id, amount, payment_date)
            VALUES ($1, $2, $3)
        `, [10, 0.00, '2026-01-18']);
        console.log(`✓ Created payment: 2026-01-18 - GHS 0.00`);

        // Update the current_balance to match
        await pool.query(`
            UPDATE customers
            SET current_balance = 
                (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE customer_id = 10 AND status = 'completed')
                - (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE customer_id = 10)
            WHERE id = 10
        `);

        // Get the new balance
        const updated = await pool.query('SELECT id, name, current_balance FROM customers WHERE id = 10');
        console.log(`\n✓ Updated customer balance: ${updated.rows[0].current_balance}`);
        
        console.log('\n✅ Sample transactions created successfully!');
        console.log('Total for customer: 50.00 + 60.64 + 54.00 = GHS 164.64');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createSampleTransactions();
