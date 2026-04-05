const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkTransactionAmounts() {
    try {
        console.log('Checking specific transaction amounts...');
        
        // Check the specific transactions mentioned
        const receipts = ['RCP1775201893600', 'RCP1775201569743'];
        
        for (const receipt of receipts) {
            console.log(`\n--- Checking ${receipt} ---`);
            
            // Get stored data
            const storedRes = await pool.query(
                'SELECT id, receipt_number, total_amount, items FROM transactions WHERE receipt_number = $1',
                [receipt]
            );
            
            if (storedRes.rows.length > 0) {
                const txn = storedRes.rows[0];
                console.log(`Stored total_amount: ₵${txn.total_amount}`);
                
                // Calculate from items
                const items = typeof txn.items === 'string' ? JSON.parse(txn.items) : txn.items;
                let calculatedTotal = 0;
                
                items.forEach(item => {
                    calculatedTotal += parseFloat(item.price) * parseInt(item.qty);
                });
                
                console.log(`Calculated from items: ₵${calculatedTotal.toFixed(2)}`);
                console.log(`Difference: ₵${(parseFloat(txn.total_amount) - calculatedTotal).toFixed(2)}`);
                console.log('Items:', items);
            }
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTransactionAmounts();
