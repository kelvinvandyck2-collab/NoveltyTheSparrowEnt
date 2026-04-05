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

async function createBranchSpecificPromos() {
    try {
        console.log('=== CREATING BRANCH-SPECIFIC DES23 PROMOS ===\n');
        
        // 1. Clean up existing DES23 promos
        console.log('1. Cleaning up existing DES23 promos...');
        await pool.query('DELETE FROM promotions WHERE code = $1', ['DES23']);
        console.log('   ✅ Cleaned up existing DES23 promos');
        
        // 2. Get branches with active users
        console.log('\n2. Getting branches with active users...');
        const userBranches = await pool.query(`
            SELECT DISTINCT u.store_id, b.name, b.location, COUNT(u.id) as user_count
            FROM users u
            LEFT JOIN branches b ON u.store_id = b.id
            WHERE u.status = 'Active' AND u.store_id IS NOT NULL
            GROUP BY u.store_id, b.name, b.location
            ORDER BY u.store_id
        `);
        
        console.log(`   Found ${userBranches.rows.length} branches with active users:`);
        userBranches.rows.forEach(branch => {
            console.log(`     Branch ${branch.store_id}: ${branch.name} (${branch.location}) - ${branch.user_count} users`);
        });
        
        // 3. Create DES23 promo for each branch with active users
        console.log('\n3. Creating DES23 promo for each branch...');
        for (const branch of userBranches.rows) {
            try {
                await pool.query(
                    'INSERT INTO promotions (code, discount_percentage, branch_id) VALUES ($1, $2, $3)',
                    ['DES23', 5.00, branch.store_id]
                );
                console.log(`   ✅ Created DES23 promo for ${branch.name} (ID: ${branch.store_id})`);
            } catch (err) {
                console.log(`   ❌ Failed to create promo for ${branch.name}: ${err.message}`);
            }
        }
        
        // 4. Revert server.js validation to branch-specific only
        console.log('\n4. Reverting server.js validation to branch-specific only...');
        
        // 5. Test validation for users
        console.log('\n5. Testing branch-specific validation:');
        const users = await pool.query(`
            SELECT id, name, email, role, store_location, store_id 
            FROM users 
            WHERE status = 'Active' 
            ORDER BY id 
            LIMIT 8
        `);
        
        for (const user of users.rows) {
            const validation = await pool.query(
                'SELECT * FROM promotions WHERE code = $1 AND branch_id = $2',
                ['DES23', user.store_id]
            );
            
            console.log(`   - ${user.name}: ${validation.rows.length > 0 ? '✅ VALID' : '❌ INVALID'} (Branch ID: ${user.store_id}, Location: ${user.store_location})`);
        }
        
        // 6. Show final promo list
        console.log('\n6. Final DES23 promo list:');
        const finalPromos = await pool.query('SELECT * FROM promotions WHERE code = $1 ORDER BY branch_id', ['DES23']);
        finalPromos.rows.forEach(promo => {
            console.log(`   Branch ${promo.branch_id}: 5% discount`);
        });
        
        console.log('\n=== SETUP COMPLETE ===');
        console.log('DES23 is now branch-specific. Users can only use it at their assigned branch.');
        console.log('The validation endpoint in server.js needs to be reverted to branch-specific only.');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

createBranchSpecificPromos();
