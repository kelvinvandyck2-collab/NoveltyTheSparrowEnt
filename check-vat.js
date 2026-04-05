const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkVATRate() {
    try {
        console.log('Checking VAT rate...');
        const res = await pool.query('SELECT vat_rate FROM system_settings LIMIT 1');
        
        if (res.rows.length > 0) {
            const vatRate = res.rows[0].vat_rate;
            console.log(`System VAT rate: ${vatRate}%`);
            
            // Calculate what the tax would be on ₵4.32
            const netAmount = 4.32;
            const taxAmount = netAmount * (parseFloat(vatRate) / 100);
            const inclusiveTotal = netAmount + taxAmount;
            
            console.log(`\nCalculation for ₵4.32:`);
            console.log(`- Net amount: ₵${netAmount.toFixed(2)}`);
            console.log(`- VAT (${vatRate}%): ₵${taxAmount.toFixed(2)}`);
            console.log(`- Inclusive total: ₵${inclusiveTotal.toFixed(2)}`);
            console.log(`- Difference from stored: ₵${(4.41 - inclusiveTotal).toFixed(2)}`);
        } else {
            console.log('No VAT rate found in system settings.');
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkVATRate();
