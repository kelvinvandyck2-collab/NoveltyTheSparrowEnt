/**
 * Test Script to Verify Enhanced Inventory System
 * Run: node test-inventory.js
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

const tests = [];
let passCount = 0;
let failCount = 0;

async function test(name, testFn) {
    try {
        await testFn();
        console.log(`✅ ${name}`);
        passCount++;
    } catch (err) {
        console.log(`❌ ${name}: ${err.message}`);
        failCount++;
    }
}

async function runTests() {
    console.log('🧪 Testing Enhanced Inventory System\n');

    // Test 1: Create Product
    let productBarcode;
    await test('Create Product with Enhanced Fields', async () => {
        const res = await axios.post(`${BASE_URL}/products`, {
            barcode: `TEST${Date.now()}`,
            name: 'Test Product',
            category: 'Beverages',
            cost_price: 5.00,
            price: 7.50,
            selling_unit: 'Bottle',
            packaging_unit: 'Box',
            conversion_rate: 24,
            reorder_level: 10,
            track_batch: true,
            track_expiry: true,
            stock: 100
        });
        productBarcode = `TEST${Date.now()}`;
        if (!res.data.success) throw new Error('Product not created');
    });

    // Test 2: Get Full Product Details
    await test('Fetch Product with Full Details', async () => {
        const res = await axios.get(`${BASE_URL}/api/products/full`);
        if (!Array.isArray(res.data)) throw new Error('Invalid response');
    });

    // Test 3: Create Supplier
    let supplierId;
    await test('Create Supplier', async () => {
        const res = await axios.post(`${BASE_URL}/api/suppliers`, {
            name: 'Test Supplier Ltd',
            contact_person: 'John Doe',
            phone: '+233 24 123 4567',
            email: 'supplier@test.com',
            address: 'Test Location'
        });
        if (!res.data.id) throw new Error('Supplier not created');
        supplierId = res.data.id;
    });

    // Test 4: Create Purchase Order
    let poId;
    await test('Create Purchase Order', async () => {
        const res = await axios.post(`${BASE_URL}/api/purchase-orders`, {
            supplier_id: supplierId,
            items: [{
                product_barcode: productBarcode,
                quantity: 10,
                unit_cost: 5.00
            }]
        });
        if (!res.data.id) throw new Error('PO not created');
        poId = res.data.id;
    });

    // Test 5: Create Pricelist
    let pricelistId;
    await test('Create Pricelist', async () => {
        const res = await axios.post(`${BASE_URL}/api/pricelists`, {
            name: 'Test Pricelist',
            list_type: 'Standard',
            effective_date: new Date().toISOString().split('T')[0],
            branch_id: 1
        });
        if (!res.data.id) throw new Error('Pricelist not created');
        pricelistId = res.data.id;
    });

    // Test 6: Add Pricelist Item with Auto-Markup
    await test('Add Pricelist Item with Auto-Markup', async () => {
        const res = await axios.post(`${BASE_URL}/api/pricelists/${pricelistId}/items`, {
            product_barcode: productBarcode,
            markup_percentage: 10
        });
        if (!res.data.sellingPrice) throw new Error('Markup calculation failed');
    });

    // Test 7: Receive Goods
    await test('Receive Goods with Batch Tracking', async () => {
        const res = await axios.post(`${BASE_URL}/api/goods-received`, {
            po_id: poId,
            received_by: 1,
            branch_id: 1,
            items: [{
                product_barcode: productBarcode,
                quantity_received: 240,
                quantity_packaging_units: 10,
                unit_cost: 5.00,
                batch_number: 'LOT20250115',
                expiry_date: '2026-01-15',
                invoice_number: 'INV-TEST-001'
            }]
        });
        if (!res.data.success) throw new Error('Goods receiving failed');
    });

    // Test 8: Move to Shelf
    await test('Move Items to Shelf', async () => {
        const res = await axios.post(`${BASE_URL}/api/shelf/move`, {
            product_barcode: productBarcode,
            quantity: 50,
            staff_id: 1,
            from_location: 'Main Warehouse',
            to_location: 'Display Shelf A',
            branch_id: 1,
            notes: 'Test movement'
        });
        if (!res.data.success) throw new Error('Shelf movement failed');
    });

    // Test 9: Get Next Batch (FEFO)
    await test('Get Next Batch for FEFO', async () => {
        const res = await axios.get(`${BASE_URL}/api/batches/next/${productBarcode}`);
        if (!res.data || !res.data.batch_number) throw new Error('Batch not found');
    });

    // Test 10: Create Stock Adjustment
    await test('Create Stock Adjustment', async () => {
        const res = await axios.post(`${BASE_URL}/api/stock-adjustments`, {
            product_barcode: productBarcode,
            adjustment_type: 'Damage',
            quantity_adjusted: -5,
            reason: 'Test damage',
            approver_id: 1,
            branch_id: 1,
            user_id: 1
        });
        if (!res.data.id) throw new Error('Adjustment not created');
    });

    // Test 11: Start Stock Take
    let stockTakeId;
    await test('Start Stock Take', async () => {
        const res = await axios.post(`${BASE_URL}/api/stock-takes`, {
            branch_id: 1,
            created_by: 1
        });
        if (!res.data.id) throw new Error('Stock take not started');
        stockTakeId = res.data.id;
    });

    // Test 12: Record Stock Count
    await test('Record Stock Count Item', async () => {
        const res = await axios.post(`${BASE_URL}/api/stock-takes/${stockTakeId}/items`, {
            product_barcode: productBarcode,
            physical_count: 285,
            counted_by: 'Test User'
        });
        if (res.data.variance === undefined) throw new Error('Count not recorded');
    });

    // Test 13: Check Reorder Alerts
    await test('Check Reorder Alerts', async () => {
        const res = await axios.post(`${BASE_URL}/api/reorder/check`, {
            branch_id: 1
        });
        if (!Array.isArray(res.data.alerts)) throw new Error('Reorder check failed');
    });

    // Test 14: Get Reorder Alerts
    await test('Get Active Reorder Alerts', async () => {
        const res = await axios.get(`${BASE_URL}/api/reorder/alerts/1`);
        if (!Array.isArray(res.data)) throw new Error('Alerts fetch failed');
    });

    // Test 15: Low Stock Report
    await test('Generate Low Stock Report', async () => {
        const res = await axios.get(`${BASE_URL}/api/reports/low-stock/1`);
        if (!Array.isArray(res.data)) throw new Error('Report generation failed');
    });

    // Test 16: Expiry Report
    await test('Generate Expiry Report', async () => {
        const res = await axios.get(`${BASE_URL}/api/reports/expiry/1`);
        if (!Array.isArray(res.data)) throw new Error('Expiry report failed');
    });

    // Test 18: Stock Summary
    await test('Get Stock Summary', async () => {
        const res = await axios.get(`${BASE_URL}/api/reports/stock-summary/1`);
        if (!res.data.total_products) throw new Error('Summary not generated');
    });

    // Test 19: Get POS Product (FEFO ready)
    await test('Get Product for POS (with FEFO)', async () => {
        const res = await axios.get(`${BASE_URL}/api/pos/product/${productBarcode}`);
        if (!res.data.batches) throw new Error('Product POS data not found');
    });

    // Test 20: Process POS Sale with Batch
    await test('Process POS Sale with Batch Tracking', async () => {
        const res = await axios.post(`${BASE_URL}/api/pos/sale/${productBarcode}`, {
            quantity: 1,
            batch_id: 1,
            user_id: 1,
            branch_id: 1
        });
        if (!res.data.success) throw new Error('Sale processing failed');
    });

    console.log(`\n📊 Test Results: ${passCount}✅ / ${failCount}❌\n`);
    if (failCount === 0) {
        console.log('🎉 All tests passed! System is fully operational.\n');
    } else {
        console.log('⚠️  Some tests failed. Check server logs and database.\n');
    }
}

// Run tests
runTests().catch(err => {
    console.error('🔴 Test suite error:', err.message);
    console.log('\nMake sure:');
    console.log('1. Server is running: npm start');
    console.log('2. Database migration completed: npm run migrate:inventory');
    console.log('3. Database connection is correct in .env');
});
