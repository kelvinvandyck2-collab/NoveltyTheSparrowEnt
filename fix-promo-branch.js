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

async function fixPromoBranch() {
    try {
        console.log('=== FIXING PROMO BRANCH ASSIGNMENT ===\n');
        
        // 1. Show current DES23 promo
        console.log('1. Current DES23 promo:');
        const currentPromo = await pool.query('SELECT * FROM promotions WHERE code = $1', ['DES23']);
        if (currentPromo.rows.length > 0) {
            const promo = currentPromo.rows[0];
            console.log(`   - Currently assigned to Branch ID: ${promo.branch_id}`);
            
            const branchInfo = await pool.query('SELECT * FROM branches WHERE id = $1', [promo.branch_id]);
            if (branchInfo.rows.length > 0) {
                console.log(`   - Branch name: ${branchInfo.rows[0].name} (${branchInfo.rows[0].location})`);
            }
        }
        
        // 2. Show all branches for selection
        console.log('\n2. Available branches:');
        const branches = await pool.query('SELECT * FROM branches ORDER BY id');
        branches.rows.forEach(branch => {
            console.log(`   ${branch.id}. ${branch.name} (${branch.location})`);
        });
        
        // 3. Update existing DES23 promo to work for ALL branches (change branch_id to NULL)
        console.log('\n3. Updating DES23 promo to work for ALL branches...');
        
        // Update the existing promo to have branch_id = NULL (makes it global)
        const updateResult = await pool.query(
            'UPDATE promotions SET branch_id = NULL WHERE code = $1',
            ['DES23']
        );
        
        console.log(`   ✅ Updated DES23 promo to be global (affected ${updateResult.rowCount} rows)`);
        
        // Alternative: Create separate promos for each branch if needed
        // for (const branch of branches.rows) {
        //     // Check if promo already exists for this branch
        //     const existing = await pool.query(
        //         'SELECT * FROM promotions WHERE code = $1 AND branch_id = $2',
        //         ['DES23', branch.id]
        //     );
        //     
        //     if (existing.rows.length === 0) {
        //         await pool.query(
        //             'INSERT INTO promotions (code, discount_percentage, branch_id) VALUES ($1, $2, $3)',
        //             ['DES23', 5.00, branch.id]
        //         );
        //         console.log(`   ✅ Created DES23 promo for ${branch.name} (ID: ${branch.id})`);
        //     } else {
        //         console.log(`   ⏭️  DES23 promo already exists for ${branch.name} (ID: ${branch.id})`);
        //     }
        // }
        
        // 4. Verify the fix
        console.log('\n4. Verification - checking promo availability for users:');
        const users = await pool.query(`
            SELECT id, name, email, role, store_location, store_id 
            FROM users 
            WHERE status = 'Active' 
            ORDER BY id 
            LIMIT 5
        `);
        
        for (const user of users.rows) {
            // For global promos (branch_id = NULL), we need a different query
            const validation = await pool.query(
                'SELECT * FROM promotions WHERE code = $1 AND (branch_id = $2 OR branch_id IS NULL)',
                ['DES23', user.store_id]
            );
            
            console.log(`   - ${user.name}: ${validation.rows.length > 0 ? '✅ VALID' : '❌ INVALID'} (Branch ID: ${user.store_id})`);
        }
        
        console.log('\n=== FIX COMPLETE ===');
        console.log('DES23 promo code should now work for users at ALL branches!');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixPromoBranch();
