const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkTaxRates() {
    try {
        console.log('Checking active tax rates...');
        const res = await pool.query('SELECT * FROM tax_rules WHERE status = \'active\' ORDER BY created_at DESC');
        
        if (res.rows.length === 0) {
            console.log('No active tax rules found.');
        } else {
            console.log('Active tax rules:');
            res.rows.forEach(tax => {
                console.log(`- ${tax.name}: ${tax.rate}% (ID: ${tax.id})`);
            });
        }
        
        // Also check system settings structure
        const settingsRes = await pool.query('SELECT * FROM system_settings LIMIT 5');
        console.log('\nSystem settings structure:');
        if (settingsRes.rows.length > 0) {
            Object.keys(settingsRes.rows[0]).forEach(key => {
                console.log(`- ${key}`);
            });
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTaxRates();
