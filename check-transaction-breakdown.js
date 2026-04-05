const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkTransactionBreakdown() {
    try {
        console.log('Checking transaction breakdown for RCP1775201893600...');
        
        const res = await pool.query(
            'SELECT * FROM transactions WHERE receipt_number = $1',
            ['RCP1775201893600']
        );
        
        if (res.rows.length > 0) {
            const txn = res.rows[0];
            console.log('\nTransaction details:');
            console.log(`- Receipt: ${txn.receipt_number}`);
            console.log(`- Total Amount: ₵${txn.total_amount}`);
            console.log(`- Original Total: ₵${txn.original_total}`);
            console.log(`- Current Total: ₵${txn.current_total}`);
            console.log(`- Tax: ₵${txn.tax}`);
            console.log(`- Payment Method: ${txn.payment_method}`);
            
            console.log('\nItems breakdown:');
            const items = typeof txn.items === 'string' ? JSON.parse(txn.items) : txn.items;
            items.forEach((item, index) => {
                console.log(`Item ${index + 1}:`);
                console.log(`- Name: ${item.name}`);
                console.log(`- Price: ₵${item.price}`);
                console.log(`- Qty: ${item.qty}`);
                console.log(`- Line Total: ₵${(parseFloat(item.price) * parseInt(item.qty)).toFixed(2)}`);
            });
            
            const calculatedTotal = items.reduce((sum, item) => 
                sum + (parseFloat(item.price) * parseInt(item.qty)), 0
            );
            console.log(`\nCalculated from items: ₵${calculatedTotal.toFixed(2)}`);
            console.log(`Stored total_amount: ₵${parseFloat(txn.total_amount).toFixed(2)}`);
            console.log(`Difference: ₵${(parseFloat(txn.total_amount) - calculatedTotal).toFixed(2)}`);
            
            if (txn.tax_breakdown) {
                console.log('\nTax breakdown:');
                const taxBreakdown = typeof txn.tax_breakdown === 'string' ? JSON.parse(txn.tax_breakdown) : txn.tax_breakdown;
                taxBreakdown.forEach((tax, index) => {
                    console.log(`Tax ${index + 1}:`);
                    console.log(`- Name: ${tax.name}`);
                    console.log(`- Rate: ${tax.rate}%`);
                    console.log(`- Amount: ₵${tax.amount}`);
                });
            }
        } else {
            console.log('Transaction not found.');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTransactionBreakdown();
