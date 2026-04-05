const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const connStr = process.env.DATABASE_URL;
const isRemote = (connStr && (
    connStr.includes('supabase.co') || 
    connStr.includes('aws-0') ||
    connStr.includes('pooler')
)) || (process.env.PGHOST && !process.env.PGHOST.includes('localhost'));

const ssl = (isRemote) ? { rejectUnauthorized: false } : false;

const commonPoolConfig = {
    max: 20,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 30000,
    query_timeout: 120000,
    maxUses: 7500,
    ssl
};

if (isRemote) {
    commonPoolConfig.keepAlive = true;
    commonPoolConfig.keepAliveInitialDelayMillis = 5000;
    commonPoolConfig.application_name = 'pos_app';
}

const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({ connectionString: cleanConnStr, ...commonPoolConfig });

async function checkPromo() {
    try {
        console.log('Checking promo code DES23...');
        
        // Check if promo exists
        const result = await pool.query('SELECT * FROM promotions WHERE code = $1', ['DES23']);
        console.log('Found promo:', result.rows);
        
        if (result.rows.length === 0) {
            console.log('DES23 promo not found. Checking all promos...');
            const allPromos = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC LIMIT 10');
            console.log('Recent promos:', allPromos.rows);
        } else {
            const promo = result.rows[0];
            console.log('Promo details:', {
                code: promo.code,
                discount: promo.discount_percentage,
                branch_id: promo.branch_id,
                created_at: promo.created_at
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkPromo();
