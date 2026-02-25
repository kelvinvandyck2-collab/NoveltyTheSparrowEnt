const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addStockToAccraBranch() {
    try {
        console.log('\n📦 ADDING STOCK TO ACCRA BRANCH...\n');
        
        // Get Milk and SMIRNOFF products
        const products = await pool.query(
            'SELECT * FROM products WHERE name IN ($1, $2)',
            ['SMIRNOFF', 'Milk']
        );

        for (const p of products.rows) {
            console.log(`\nUpdating ${p.name}:`);
            console.log('  Current stock_levels:', p.stock_levels);

            // Add 20 units to Accra Branch
            const updatedLevels = {
                ...p.stock_levels,
                'Accra Branch': (p.stock_levels['Accra Branch'] || 0) + 20
            };

            // Update total stock
            const totalStock = Object.values(updatedLevels).reduce((sum, val) => sum + (val || 0), 0);

            const result = await pool.query(
                'UPDATE products SET stock_levels = $1, stock = $2 WHERE barcode = $3 RETURNING *',
                [JSON.stringify(updatedLevels), totalStock, p.barcode]
            );

            console.log('  New stock_levels:', result.rows[0].stock_levels);
            console.log('  New total stock:', result.rows[0].stock);
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

addStockToAccraBranch();
