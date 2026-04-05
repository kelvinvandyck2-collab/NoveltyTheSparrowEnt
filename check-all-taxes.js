const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

async function checkAllTaxRules() {
    try {
        console.log('Checking ALL tax rules...');
        const res = await pool.query('SELECT * FROM tax_rules ORDER BY created_at DESC');
        
        if (res.rows.length === 0) {
            console.log('No tax rules found.');
        } else {
            console.log(`Found ${res.rows.length} tax rules:`);
            res.rows.forEach(tax => {
                console.log(`- ${tax.name}: ${tax.rate}% (Status: ${tax.status}, ID: ${tax.id})`);
            });
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkAllTaxRules();
