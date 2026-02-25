/**
 * Enhanced Inventory Management API Endpoints
 * Add these to your server.js file
 */

// ============ 1. ENHANCED PRODUCT MANAGEMENT ============

// Get all products with full details
app.get('/api/products/full', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*,
                (SELECT COUNT(*) FROM product_batches pb WHERE pb.product_barcode = p.barcode AND pb.status = 'Active') as batch_count,
                (SELECT MIN(expiry_date) FROM product_batches pb WHERE pb.product_barcode = p.barcode AND pb.status = 'Active') as next_expiry
            FROM products p
            ORDER BY p.name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

// Update product with enhanced fields
app.put('/api/products/:barcode/full', async (req, res) => {
    const { barcode } = req.params;
    const { 
        name, category, cost_price, price, selling_unit, packaging_unit, 
        conversion_rate, reorder_level, track_batch, track_expiry 
    } = req.body;
    
    try {
        await pool.query(`
            UPDATE products SET
                name = $1, category = $2, cost_price = $3, price = $4,
                selling_unit = $5, packaging_unit = $6, conversion_rate = $7,
                reorder_level = $8, track_batch = $9, track_expiry = $10,
                updated_at = CURRENT_TIMESTAMP
            WHERE barcode = $11
        `, [name, category, cost_price, price, selling_unit, packaging_unit, 
            conversion_rate, reorder_level, track_batch, track_expiry, barcode]);
        res.json({ success: true, message: 'Product updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating product' });
    }
});

// ============ 2. PRICING & PRICELIST MANAGEMENT ============

// Create new pricelist
app.post('/api/pricelists', async (req, res) => {
    const { name, list_type, effective_date, branch_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO price_lists (name, list_type, effective_date, branch_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, list_type, effective_date, branch_id, 'Active']
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating pricelist' });
    }
});

// Add items to pricelist with auto-markup calculation
app.post('/api/pricelists/:id/items', async (req, res) => {
    const { id } = req.params;
    const { product_barcode, markup_percentage } = req.body;
    
    try {
        // Get product cost price
        const productRes = await pool.query(
            'SELECT cost_price FROM products WHERE barcode = $1',
            [product_barcode]
        );
        
        if (productRes.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const costPrice = productRes.rows[0].cost_price;
        const sellingPrice = costPrice * (1 + (markup_percentage / 100));
        
        await pool.query(
            'INSERT INTO price_list_items (price_list_id, product_barcode, markup_percentage, selling_price) VALUES ($1, $2, $3, $4)',
            [id, product_barcode, markup_percentage, sellingPrice]
        );
        
        res.json({ success: true, sellingPrice });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error adding pricelist item' });
    }
});

// Get pricelists
app.get('/api/pricelists', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM price_lists ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching pricelists' });
    }
});

// ============ 3. GOODS RECEIVING ============

// Receive goods from PO with batch tracking
app.post('/api/goods-received', async (req, res) => {
    const { po_id, items, received_by, branch_id } = req.body;
    
    try {
        for (const item of items) {
            const { product_barcode, quantity_received, quantity_packaging_units, unit_cost, batch_number, expiry_date, invoice_number } = item;
            
            // Insert goods received log
            await pool.query(`
                INSERT INTO goods_received 
                (po_id, product_barcode, quantity_received, quantity_packaging_units, unit_cost, batch_number, expiry_date, received_by, invoice_number, branch_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [po_id, product_barcode, quantity_received, quantity_packaging_units, unit_cost, batch_number, expiry_date, received_by, invoice_number, branch_id]);
            
            // Create batch record if tracking enabled
            const trackBatch = await pool.query('SELECT track_batch FROM products WHERE barcode = $1', [product_barcode]);
            if (trackBatch.rows[0]?.track_batch) {
                await pool.query(`
                    INSERT INTO product_batches (product_barcode, batch_number, expiry_date, quantity_received, quantity_available, unit_cost, branch_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (product_barcode, batch_number, branch_id) DO UPDATE SET
                        quantity_received = quantity_received + $4,
                        quantity_available = quantity_available + $4
                `, [product_barcode, batch_number, expiry_date, quantity_received, quantity_received, unit_cost, branch_id]);
            }
            
            // Update product stock (convert packaging units to selling units)
            const product = await pool.query('SELECT conversion_rate FROM products WHERE barcode = $1', [product_barcode]);
            const sellableUnits = quantity_packaging_units * product.rows[0].conversion_rate;
            
            await pool.query(
                'UPDATE products SET stock = stock + $1 WHERE barcode = $2',
                [sellableUnits, product_barcode]
            );
            
            // Log audit trail
            await pool.query(`
                INSERT INTO inventory_audit_log (action_type, product_barcode, quantity_after, reference_id, reference_type, user_id, branch_id)
                SELECT 'Stock In', $1, stock, $2, 'Purchase Order', $3, $4 FROM products WHERE barcode = $1
            `, [product_barcode, po_id, received_by, branch_id]);
        }
        
        // Update PO status
        await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['Received', po_id]);
        
        res.json({ success: true, message: 'Goods received successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error receiving goods', error: err.message });
    }
});

// ============ 4. SHELF MANAGEMENT ============

// Move items to shelf
app.post('/api/shelf/move', async (req, res) => {
    const { product_barcode, quantity, staff_id, from_location, to_location, branch_id, notes } = req.body;
    
    try {
        // Check store quantity
        const product = await pool.query('SELECT stock FROM products WHERE barcode = $1', [product_barcode]);
        if (product.rows[0].stock < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }
        
        // Update shelf inventory
        await pool.query(`
            INSERT INTO shelf_inventory (product_barcode, quantity_on_shelf, store_quantity, staff_id, branch_id, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (product_barcode) DO UPDATE SET
                quantity_on_shelf = quantity_on_shelf + $2
        `, [product_barcode, quantity, 0, staff_id, branch_id, notes]);
        
        // Log movement
        await pool.query(`
            INSERT INTO shelf_movements (product_barcode, movement_type, quantity, staff_id, from_location, to_location, branch_id, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [product_barcode, 'Store to Shelf', quantity, staff_id, from_location, to_location, branch_id, notes]);
        
        res.json({ success: true, message: 'Item moved to shelf' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error moving item to shelf' });
    }
});

// Get shelf inventory
app.get('/api/shelf/inventory/:branch_id', async (req, res) => {
    const { branch_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT si.*, p.name, p.selling_unit
            FROM shelf_inventory si
            JOIN products p ON si.product_barcode = p.barcode
            WHERE si.branch_id = $1
            ORDER BY si.product_barcode
        `, [branch_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching shelf inventory' });
    }
});

// ============ 5. BATCH & EXPIRY CONTROL ============

// Get expiring batches (FEFO alert)
app.get('/api/batches/expiring/:days', async (req, res) => {
    const { days } = req.params;
    try {
        const result = await pool.query(`
            SELECT pb.*, p.name, p.selling_unit,
                EXTRACT(DAY FROM pb.expiry_date - CURRENT_DATE) as days_to_expiry
            FROM product_batches pb
            JOIN products p ON pb.product_barcode = p.barcode
            WHERE pb.status = 'Active' 
                AND pb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $1
            ORDER BY pb.expiry_date ASC
        `, [days]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching expiring batches' });
    }
});

// Get next available batch (FIFO/FEFO)
app.get('/api/batches/next/:product_barcode', async (req, res) => {
    const { product_barcode } = req.params;
    try {
        // FEFO: First Expiry First Out
        const result = await pool.query(`
            SELECT * FROM product_batches
            WHERE product_barcode = $1 AND status = 'Active' AND quantity_available > 0
            ORDER BY expiry_date ASC, created_at ASC
            LIMIT 1
        `, [product_barcode]);
        
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching next batch' });
    }
});

// ============ 6. STOCK ADJUSTMENTS ============

// Create stock adjustment
app.post('/api/stock-adjustments', async (req, res) => {
    const { product_barcode, adjustment_type, quantity_adjusted, reason, approver_id, branch_id, user_id } = req.body;
    
    try {
        const result = await pool.query(`
            INSERT INTO stock_adjustments (product_barcode, adjustment_type, quantity_adjusted, reason, approver_id, branch_id, approved_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING id
        `, [product_barcode, adjustment_type, quantity_adjusted, reason, approver_id, branch_id]);
        
        // Update product stock
        await pool.query(
            'UPDATE products SET stock = stock + $1 WHERE barcode = $2',
            [quantity_adjusted, product_barcode]
        );
        
        // Audit log
        await pool.query(`
            INSERT INTO inventory_audit_log (action_type, product_barcode, quantity_after, reference_id, reference_type, user_id, branch_id, notes)
            SELECT 'Stock Adjustment', $1, stock, $2, 'Adjustment', $3, $4, $5 FROM products WHERE barcode = $1
        `, [product_barcode, result.rows[0].id, user_id, branch_id, reason]);
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating adjustment' });
    }
});

// ============ 7. STOCK TAKING (PHYSICAL COUNT) ============

// Start stock take
app.post('/api/stock-takes', async (req, res) => {
    const { branch_id, created_by } = req.body;
    try {
        const result = await pool.query(`
            INSERT INTO stock_takes (stock_take_date, branch_id, created_by, status)
            VALUES (CURRENT_DATE, $1, $2, 'In Progress')
            RETURNING id
        `, [branch_id, created_by]);
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ message: 'Error starting stock take' });
    }
});

// Record stock take item count
app.post('/api/stock-takes/:id/items', async (req, res) => {
    const { id } = req.params;
    const { product_barcode, physical_count, counted_by } = req.body;
    
    try {
        // Get system count
        const systemCount = await pool.query('SELECT stock FROM products WHERE barcode = $1', [product_barcode]);
        const variance = physical_count - systemCount.rows[0].stock;
        
        await pool.query(`
            INSERT INTO stock_take_items (stock_take_id, product_barcode, physical_count, system_count, variance, counted_by, counted_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `, [id, product_barcode, physical_count, systemCount.rows[0].stock, variance, counted_by]);
        
        res.json({ success: true, variance });
    } catch (err) {
        res.status(500).json({ message: 'Error recording stock count' });
    }
});

// Approve and finalize stock take
app.post('/api/stock-takes/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { approved_by } = req.body;
    
    try {
        // Get all items for this stock take
        const items = await pool.query('SELECT * FROM stock_take_items WHERE stock_take_id = $1', [id]);
        
        // Apply variances to product stock
        for (const item of items.rows) {
            if (item.variance !== 0) {
                await pool.query(
                    'UPDATE products SET stock = $1 WHERE barcode = $2',
                    [item.physical_count, item.product_barcode]
                );
                
                // Log adjustment
                await pool.query(`
                    INSERT INTO inventory_audit_log (action_type, product_barcode, quantity_before, quantity_after, reference_id, reference_type, user_id)
                    VALUES ('Stock Take Variance', $1, $2, $3, $4, 'Stock Take', $5)
                `, [item.product_barcode, item.system_count, item.physical_count, id, approved_by]);
            }
        }
        
        // Calculate total variance
        const varianceResult = await pool.query(
            'SELECT COALESCE(SUM(variance), 0) as total_variance FROM stock_take_items WHERE stock_take_id = $1',
            [id]
        );
        
        // Update stock take
        await pool.query(`
            UPDATE stock_takes SET status = 'Approved', approved_by = $1, completed_at = CURRENT_TIMESTAMP, variance_total = $2
            WHERE id = $3
        `, [approved_by, varianceResult.rows[0].total_variance, id]);
        
        res.json({ success: true, message: 'Stock take approved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error approving stock take' });
    }
});

// ============ 8. REORDER ALERTS ============

// Check and generate reorder alerts
app.post('/api/reorder/check', async (req, res) => {
    const { branch_id } = req.body;
    try {
        // Find products below reorder level
        const result = await pool.query(`
            SELECT p.barcode, p.name, p.stock, p.reorder_level,
                CASE 
                    WHEN p.stock = 0 THEN 'Critical'
                    WHEN p.stock <= p.reorder_level THEN 'High'
                    ELSE 'Normal'
                END as priority,
                (p.reorder_level * 2) as suggested_quantity
            FROM products p
            WHERE p.stock <= p.reorder_level
            ORDER BY p.stock ASC
        `);
        
        // Insert or update alerts
        for (const product of result.rows) {
            await pool.query(`
                INSERT INTO reorder_alerts (product_barcode, current_stock, reorder_level, suggested_quantity, priority, branch_id, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'Active')
                ON CONFLICT (product_barcode) DO UPDATE SET
                    current_stock = $2, priority = $5, created_at = CURRENT_TIMESTAMP
            `, [product.barcode, product.stock, product.reorder_level, product.suggested_quantity, product.priority, branch_id]);
        }
        
        res.json({ success: true, alerts: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error checking reorder alerts' });
    }
});

// Get active reorder alerts
app.get('/api/reorder/alerts/:branch_id', async (req, res) => {
    const { branch_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT ra.*, p.name, p.selling_unit
            FROM reorder_alerts ra
            JOIN products p ON ra.product_barcode = p.barcode
            WHERE ra.branch_id = $1 AND ra.status = 'Active'
            ORDER BY 
                CASE WHEN ra.priority = 'Critical' THEN 1 WHEN ra.priority = 'High' THEN 2 ELSE 3 END,
                ra.current_stock ASC
        `, [branch_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching alerts' });
    }
});

// ============ 9. STOCK DISTRIBUTION (TRANSFERS) ============

// Get transfer details
app.get('/api/transfers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const transfer = await pool.query('SELECT * FROM stock_transfers WHERE id = $1', [id]);
        const items = await pool.query('SELECT * FROM stock_transfer_items WHERE transfer_id = $1', [id]);
        
        res.json({ transfer: transfer.rows[0], items: items.rows });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching transfer' });
    }
});

// Confirm transfer receipt
app.post('/api/transfers/:id/confirm', async (req, res) => {
    const { id } = req.params;
    const { confirmed_by, items_received } = req.body;
    
    try {
        // Update transfer items with received quantities
        for (const item of items_received) {
            await pool.query(`
                UPDATE stock_transfer_items SET quantity_received = $1 WHERE id = $2
            `, [item.quantity_received, item.id]);
        }
        
        // Update transfer status
        await pool.query(`
            UPDATE stock_transfers SET status = 'Confirmed', confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [confirmed_by, id]);
        
        res.json({ success: true, message: 'Transfer confirmed' });
    } catch (err) {
        res.status(500).json({ message: 'Error confirming transfer' });
    }
});

// ============ 10. REPORTING & ANALYTICS ============

// Low stock report
app.get('/api/reports/low-stock/:branch_id', async (req, res) => {
    const { branch_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT p.barcode, p.name, p.category, p.stock, p.reorder_level,
                (p.reorder_level - p.stock) as shortage,
                ROUND((p.stock::decimal / NULLIF(p.reorder_level, 0)) * 100, 2) as stock_percentage
            FROM products p
            WHERE p.stock < p.reorder_level
            ORDER BY shortage DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error generating report' });
    }
});

// Expiry report
app.get('/api/reports/expiry/:branch_id', async (req, res) => {
    const { branch_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT pb.*, p.name, p.selling_unit,
                EXTRACT(DAY FROM pb.expiry_date - CURRENT_DATE) as days_to_expiry,
                CASE 
                    WHEN pb.expiry_date < CURRENT_DATE THEN 'Expired'
                    WHEN pb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 'Expiring Soon'
                    WHEN pb.expiry_date BETWEEN CURRENT_DATE + INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days' THEN 'Near Expiry'
                    ELSE 'OK'
                END as status
            FROM product_batches pb
            JOIN products p ON pb.product_barcode = p.barcode
            WHERE pb.branch_id = $1 AND pb.status = 'Active'
            ORDER BY pb.expiry_date ASC
        `, [branch_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error generating expiry report' });
    }
});

// Fast/slow moving items
app.get('/api/reports/performance/:branch_id/:year/:month', async (req, res) => {
    const { branch_id, year, month } = req.params;
    try {
        const result = await pool.query(`
            SELECT p.barcode, p.name, p.category,
                COALESCE(pp.quantity_sold, 0) as quantity_sold,
                COALESCE(pp.revenue, 0) as revenue,
                COALESCE(pp.classification, 'Unknown') as classification,
                p.stock as current_stock
            FROM products p
            LEFT JOIN product_performance pp ON p.barcode = pp.product_barcode
                AND pp.year = $2 AND pp.month = $3 AND pp.branch_id = $1
            ORDER BY COALESCE(pp.quantity_sold, 0) DESC
        `, [branch_id, year, month]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error generating performance report' });
    }
});

// Stock summary
app.get('/api/reports/stock-summary/:branch_id', async (req, res) => {
    const { branch_id } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_units,
                SUM(stock * cost_price) as total_cost_value,
                SUM(stock * price) as total_retail_value,
                COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count,
                COUNT(CASE WHEN stock <= reorder_level THEN 1 END) as low_stock_count
            FROM products
        `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error generating summary' });
    }
});

// ============ 11. INTEGRATION WITH POS SYSTEM ============

// Get product for POS with batch selection
app.get('/api/pos/product/:barcode', async (req, res) => {
    const { barcode } = req.params;
    try {
        const product = await pool.query('SELECT * FROM products WHERE barcode = $1', [barcode]);
        
        if (product.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const prod = product.rows[0];
        
        // Check if stock is available
        if (prod.stock <= 0) {
            return res.status(400).json({ message: 'Out of stock' });
        }
        
        // Get available batches (FEFO order)
        let batches = [];
        if (prod.track_batch) {
            const batchResult = await pool.query(`
                SELECT * FROM product_batches
                WHERE product_barcode = $1 AND status = 'Active' AND quantity_available > 0
                ORDER BY expiry_date ASC, created_at ASC
            `, [barcode]);
            batches = batchResult.rows;
        }
        
        res.json({ ...prod, batches });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching product' });
    }
});

// Process sale with batch tracking
app.post('/api/pos/sale/:barcode', async (req, res) => {
    const { barcode } = req.params;
    const { quantity, batch_id, user_id, branch_id } = req.body;
    
    try {
        const product = await pool.query('SELECT * FROM products WHERE barcode = $1', [barcode]);
        
        if (product.rows.length === 0 || product.rows[0].stock < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }
        
        // If batch tracked, update batch quantity
        if (batch_id) {
            await pool.query(
                'UPDATE product_batches SET quantity_sold = quantity_sold + $1, quantity_available = quantity_available - $1 WHERE id = $2',
                [quantity, batch_id]
            );
        }
        
        // Update product stock
        await pool.query(
            'UPDATE products SET stock = stock - $1 WHERE barcode = $2',
            [quantity, barcode]
        );
        
        // Log audit
        await pool.query(`
            INSERT INTO inventory_audit_log (action_type, product_barcode, quantity_before, quantity_after, reference_id, reference_type, user_id, branch_id)
            SELECT 'Sale', $1, $2 + $3, stock, NULL, 'POS Sale', $4, $5 FROM products WHERE barcode = $1
        `, [barcode, product.rows[0].stock, quantity, user_id, branch_id]);
        
        res.json({ success: true, remaining_stock: product.rows[0].stock - quantity });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error processing sale' });
    }
});
