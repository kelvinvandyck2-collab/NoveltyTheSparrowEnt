const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    const res = await pool.query("SELECT name, stock_levels, reorder_level FROM products");
    let bottlenecks = [];
    res.rows.forEach(p => {
        let reorder = p.reorder_level || 10;
        let levelsObj = p.stock_levels;
        if (typeof levelsObj === 'string') {
            try { levelsObj = JSON.parse(levelsObj); } catch(e) { levelsObj = {}; }
        }
        if (!levelsObj) levelsObj = {};
        
        Object.keys(levelsObj).forEach(k => {
            const stock = parseInt(levelsObj[k]);
            if (stock <= reorder) {
                bottlenecks.push({name: p.name, branch: k, stock, reorder});
            }
        });
    });
    
    const low = bottlenecks.filter(b => b.stock > 0 && b.stock <= b.reorder);
    const negative = bottlenecks.filter(b => b.stock < 0);
    const zero = bottlenecks.filter(b => b.stock === 0);
    
    console.log(`Low: ${low.length}, Zero: ${zero.length}, Negative: ${negative.length}`);
    if (low.length > 0) console.log("Example Low:", low[0]);
    await pool.end();
}
run().catch(console.error);
