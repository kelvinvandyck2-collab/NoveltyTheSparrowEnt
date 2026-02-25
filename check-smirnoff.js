const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSmirnoff() {
    try {
        console.log('\n📦 CHECKING SMIRNOFF STOCK:');
        console.log('═════════════════════════════════════════════════════\n');

        // Check SMIRNOFF product
        const smirnoffResult = await pool.query(
            "SELECT barcode, name, stock, stock_levels FROM products WHERE name ILIKE '%SMIRNOFF%'"
        );

        if (smirnoffResult.rows.length === 0) {
            console.log('❌ No SMIRNOFF product found');
        } else {
            smirnoffResult.rows.forEach(p => {
                console.log(`Product: ${p.name}`);
                console.log(`Barcode: ${p.barcode}`);
                console.log(`Total Stock: ${p.stock}`);
                console.log(`Stock Levels (by location):`, p.stock_levels);
                console.log('');
            });
        }

        // Check user assignments
        console.log('👤 USER ASSIGNMENTS:');
        console.log('═════════════════════════════════════════════════════\n');
        const usersResult = await pool.query(
            "SELECT id, email, name, store_id, store_location FROM users LIMIT 5"
        );

        usersResult.rows.forEach(u => {
            console.log(`Email: ${u.email}`);
            console.log(`  Name: ${u.name}`);
            console.log(`  Store ID: ${u.store_id}`);
            console.log(`  Store Location: ${u.store_location}`);
            console.log('');
        });

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSmirnoff();
