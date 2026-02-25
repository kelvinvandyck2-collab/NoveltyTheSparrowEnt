const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkUserBranch() {
    try {
        // Get admin user
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            ['admin@footprint.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User admin@footprint.com not found');
            await pool.end();
            return;
        }

        const user = userResult.rows[0];
        console.log('\n👤 ADMIN USER ASSIGNMENT:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Email:', user.email);
        console.log('  Name:', user.name);
        console.log('  Role:', user.role);
        console.log('  Store ID:', user.store_id);
        console.log('  Store Location (Branch):', user.store_location || 'Not Set');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Check if there's a stores table
        const storesCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'stores' LIMIT 1
        `);
        
        if (storesCheck.rows.length > 0) {
            const storeResult = await pool.query(
                "SELECT * FROM stores WHERE id = $1",
                [user.store_id]
            );
            
            if (storeResult.rows.length > 0) {
                const store = storeResult.rows[0];
                console.log('📍 ASSIGNED STORE/BRANCH:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                Object.keys(store).forEach(key => {
                    console.log(`  ${key}: ${store[key]}`);
                });
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            }
        }
        
        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
    }
}

checkUserBranch();
