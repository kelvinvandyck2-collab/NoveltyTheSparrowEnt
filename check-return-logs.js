const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL;
const cleanConnStr = connStr.replace(/sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/&&/g, '&').replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnStr,
    ssl: { rejectUnauthorized: false }
});

function formatDetails(details) {
    if (!details) return '';
    
    // Handle JSONB data - it might already be an object
    if (typeof details === 'object' && details !== null) {
        // Check if it's a broken object (toString returns [object Object])
        if (details.toString() === '[object Object]' && Object.keys(details).length === 0) {
            return 'Return transaction details (data format issue - fixed in newer entries)';
        }
        // It's already an object, no need to parse
    } else if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch(e) { return details; }
    }
    
    // Custom formatter for RETURN_SALE
    if (details.total !== undefined && details.receiptNumber && details.originalTransactionId) {
        return `Return Receipt #${details.receiptNumber}, Total: -${details.total}, Items: ${details.itemCount}, Original Transaction: ${details.originalTransactionId}`;
    }
    
    // Generic fallback: Key-Value pairs
    return Object.entries(details)
        .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
        .join(', ');
}

async function checkReturnLogs() {
    try {
        console.log('Checking activity logs for RETURN_SALE entries...');
        const res = await pool.query(`
            SELECT a.action, a.details, a.created_at, u.email, u.name 
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.action = 'RETURN_SALE'
            ORDER BY a.created_at DESC 
            LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log('No RETURN_SALE entries found.');
        } else {
            console.log(`Found ${res.rows.length} RETURN_SALE entries:`);
            res.rows.forEach(log => {
                const date = new Date(log.created_at).toLocaleString();
                const user = log.name ? `${log.name} (${log.email})` : log.email;
                const details = formatDetails(log.details);
                
                console.log(`\n[${date}] RETURN_SALE`);
                console.log(`User: ${user}`);
                console.log(`Details: ${details}`);
                console.log('---');
            });
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkReturnLogs();
