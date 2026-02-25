const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function formatAction(action) {
    if (!action) return 'UNKNOWN';
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDetails(details) {
    if (!details) return '';
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch(e) { return details; }
    }
    
    // Custom formatters for common actions
    if (details.name && details.barcode && details.stock !== undefined) {
        return `Product: ${details.name} (${details.barcode}), Stock Level: ${details.stock}`;
    }
    // Format for DELETE PRODUCT and other simple product actions
    if (details.name && details.barcode) {
        return `Product: ${details.name} (${details.barcode})`;
    }
    if (details.receiptNumber && details.total) {
        return `Receipt #${details.receiptNumber}, Total: ${details.total}, Items: ${details.itemCount}`;
    }
    if (details.role && details.email) {
        return `Role: ${details.role}`;
    }
    
    // Generic fallback: Key-Value pairs
    return Object.entries(details)
        .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
        .join(', ');
}

let branchMap = {
    1: 'Main Warehouse',
    2: 'Accra Branch',
    3: 'Kumasi Branch'
};

function getBranchName(id) {
    if (!id) return 'N/A';
    return branchMap[id] || `Branch ${id}`;
}

async function viewAuditLogs() {
    const showAll = process.argv.includes('--all'); 
    const limit = showAll ? '' : 'LIMIT 20';
    const logTitle = showAll ? 'ALL' : 'Last 20';

    try {
        // Dynamically fetch branch names from users table to support additional branches
        try {
            const branchRes = await pool.query('SELECT DISTINCT store_id, store_location FROM users WHERE store_id IS NOT NULL');
            branchRes.rows.forEach(row => {
                if (row.store_id && row.store_location) {
                    branchMap[row.store_id] = row.store_location;
                }
            });
        } catch (e) { /* Continue with defaults if query fails */ }

        console.log(`\n🔍 SYSTEM ACTIVITY LOGS (${logTitle}) [Branches Detected: ${Object.keys(branchMap).length}]:`);
        console.log('═════════════════════════════════════════════════════');
        
        // Check if activity_logs exists first to prevent crash
        const activityCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'activity_logs'
            );
        `);

        if (activityCheck.rows[0].exists) {
            const res = await pool.query(`
                SELECT a.id, a.action, a.details, a.ip_address, a.created_at, u.email, u.name 
                FROM activity_logs a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC 
                ${limit}
            `);

            if (res.rows.length === 0) {
                console.log('No activity logs found.');
            } else {
                res.rows.forEach(log => {
                    const date = new Date(log.created_at).toLocaleString();
                    const user = log.name ? `${log.name} (${log.email})` : (log.email || 'System');
                    const action = formatAction(log.action);
                    const details = formatDetails(log.details);

                    console.log(`[${date}] ${action}`);
                    console.log(`  User:    ${user}`);
                    console.log(`  IP:      ${log.ip_address || 'N/A'}`);
                    if (details) console.log(`  Details: ${details}`);
                    console.log('-----------------------------------------------------');
                });
            }
        } else {
            console.log('⚠️  Table "activity_logs" not found. Security logs are not enabled.');
        }

        console.log(`\n\n📦 INVENTORY AUDIT LOGS (${logTitle}):`);
        console.log('═════════════════════════════════════════════════════');

        // Check if inventory_audit_log exists first
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'inventory_audit_log'
            );
        `);

        if (tableCheck.rows[0].exists) {
            const invRes = await pool.query(`
                SELECT i.*, p.name as product_name, u.email, u.name as user_name
                FROM inventory_audit_log i
                LEFT JOIN products p ON i.product_barcode = p.barcode
                LEFT JOIN users u ON i.user_id = u.id
                ORDER BY i.created_at DESC
                ${limit}
            `);

            if (invRes.rows.length === 0) {
                console.log('No inventory audit logs found.');
            } else {
                invRes.rows.forEach(log => {
                    const date = new Date(log.created_at).toLocaleString();
                    const user = log.user_name ? `${log.user_name} (${log.email})` : (log.email || 'System');
                    const ref = log.reference_id ? `#${log.reference_id}` : '';
                    const diff = log.quantity_after - log.quantity_before;
                    
                    let changeLabel = "Change";
                    if (diff > 0) changeLabel = "Qty Added";
                    else if (diff < 0) changeLabel = "Qty Removed";
                    
                    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

                    console.log(`[${date}] ${log.action_type}`);
                    console.log(`  Product: ${log.product_name || 'Unknown'} (${log.product_barcode})`);
                    console.log(`  Stock:   ${log.quantity_before} ➝ ${log.quantity_after}  [${changeLabel}: ${diffStr}]`);
                    console.log(`  User:    ${user}`);
                    console.log(`  Branch:  ${getBranchName(log.branch_id)}`);
                    console.log(`  Source:  ${log.reference_type} ${ref}`);
                    if (log.notes) console.log(`  Notes:   ${log.notes}`);
                    console.log('-----------------------------------------------------');
                });
            }
        } else {
            console.log('Inventory audit log table does not exist yet.');
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

viewAuditLogs();