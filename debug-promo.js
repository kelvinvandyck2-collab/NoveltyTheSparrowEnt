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

async function debugPromo() {
    try {
        console.log('=== PROMO CODE DEBUG ===\n');
        
        // 1. Check DES23 promo details
        console.log('1. DES23 Promo Details:');
        const promo = await pool.query('SELECT * FROM promotions WHERE code = $1', ['DES23']);
        console.log('   Found:', promo.rows);
        
        if (promo.rows.length > 0) {
            const promoData = promo.rows[0];
            console.log(`   - Code: ${promoData.code}`);
            console.log(`   - Discount: ${promoData.discount_percentage}%`);
            console.log(`   - Branch ID: ${promoData.branch_id}`);
            console.log(`   - Created: ${promoData.created_at}`);
        }
        
        // 2. Check all branches
        console.log('\n2. All Branches:');
        const branches = await pool.query('SELECT * FROM branches ORDER BY id');
        branches.rows.forEach(branch => {
            console.log(`   - ID ${branch.id}: ${branch.name} (${branch.location})`);
        });
        
        // 3. Check active users
        console.log('\n3. Active Users (first 5):');
        const users = await pool.query(`
            SELECT id, name, email, role, store_location, store_id 
            FROM users 
            WHERE status = 'Active' 
            ORDER BY id 
            LIMIT 5
        `);
        users.rows.forEach(user => {
            console.log(`   - ${user.name} (${user.email}): Branch ID ${user.store_id}, Location: ${user.store_location}`);
        });
        
        // 4. Test validation for each user
        console.log('\n4. Promo Validation Test:');
        for (const user of users.rows) {
            const validation = await pool.query(
                'SELECT * FROM promotions WHERE code = $1 AND (branch_id = $2 OR branch_id IS NULL)',
                ['DES23', user.store_id]
            );
            
            console.log(`   - ${user.name}: ${validation.rows.length > 0 ? '✅ VALID' : '❌ INVALID'} (Branch ID: ${user.store_id})`);
        }
        
        // 5. Check which branch SHOULD have the promo
        if (promo.rows.length > 0) {
            const promoBranchId = promo.rows[0].branch_id;
            const branchWithPromo = await pool.query('SELECT * FROM branches WHERE id = $1', [promoBranchId]);
            
            console.log('\n5. Branch that has DES23 promo:');
            if (branchWithPromo.rows.length > 0) {
                const branch = branchWithPromo.rows[0];
                console.log(`   - ID ${branch.id}: ${branch.name} (${branch.location})`);
                
                // Show users at this branch
                const usersAtBranch = await pool.query(
                    'SELECT name, email FROM users WHERE store_id = $1 AND status = \'Active\'',
                    [promoBranchId]
                );
                console.log(`   - Users at this branch: ${usersAtBranch.rows.length} users`);
                usersAtBranch.rows.forEach(user => {
                    console.log(`     * ${user.name} (${user.email})`);
                });
            } else {
                console.log(`   - Branch ID ${promoBranchId} not found in branches table!`);
            }
        }
        
        console.log('\n=== DEBUG COMPLETE ===');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

debugPromo();
