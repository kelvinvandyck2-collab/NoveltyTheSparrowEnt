const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateAdminLocation() {
    try {
        console.log('\n🔧 UPDATING ADMIN STORE LOCATION...\n');
        
        // Update admin user to have store_location set to Accra Central
        const result = await pool.query(
            'UPDATE users SET store_location = $1 WHERE email = $2 RETURNING *',
            ['Accra Central', 'admin@footprint.com']
        );

        if (result.rows.length > 0) {
            console.log('✅ Successfully updated admin@footprint.com:');
            console.log(result.rows[0]);
        } else {
            console.log('❌ User not found');
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateAdminLocation();
