// Add single/bulk product variants with shared barcode
// Usage: node add-product-variants.js "Product Name" "SHARED_BARCODE" "Single Price" "Bulk Price" "Category"
// Examples:
// node add-product-variants.js "Coca Cola" "COKE001" 4.50 108.00 "Beverages"
// node add-product-variants.js "Bread" "BREAD001" 15.00 280.00 "Bakery"
// node add-product-variants.js "Soap" "SOAP001" 8.00 150.00 "Toiletries"

async function addProductVariants() {
    const args = process.argv.slice(2);
    
    if (args.length < 5) {
        console.log('🚀 Add Product Variants with Shared Barcode');
        console.log('');
        console.log('Usage: node add-product-variants.js "Product Name" "SHARED_BARCODE" "Single Price" "Bulk Price" "Category"');
        console.log('');
        console.log('Examples:');
        console.log('  node add-product-variants.js "Coca Cola" "COKE001" 4.50 108.00 "Beverages"');
        console.log('  node add-product-variants.js "Bread" "BREAD001" 15.00 280.00 "Bakery"');
        console.log('  node add-product-variants.js "Soap" "SOAP001" 8.00 150.00 "Toiletries"');
        console.log('');
        console.log('This will create:');
        console.log('  1. Product Name (single) - Single Price');
        console.log('  2. Product Name Pack (bulk) - Bulk Price');
        console.log('  Both will share the same SHARED_BARCODE');
        return;
    }
    
    const [productName, sharedBarcode, singlePrice, bulkPrice, category] = args;
    
    try {
        // Login
        const loginResponse = await fetch('http://localhost:5008/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@footprint.com',
                password: 'password123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed');
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful');
        
        // Check if shared barcode already exists
        const productsResponse = await fetch('http://localhost:5008/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!productsResponse.ok) {
            console.log('❌ Failed to get products');
            return;
        }
        
        const allProducts = await productsResponse.json();
        const existingWithSharedBarcode = allProducts.filter(p => p.group_barcode === sharedBarcode);
        
        if (existingWithSharedBarcode.length > 0) {
            console.log(`\n⚠️  Shared barcode "${sharedBarcode}" already exists with these products:`);
            existingWithSharedBarcode.forEach(p => {
                console.log(`   - ${p.name} - ₵${p.price}`);
            });
            console.log(`\n❌ Please use a different shared barcode or update the existing products.`);
            return;
        }
        
        // Create single unit product
        console.log(`\n📦 Creating ${productName} (single)...`);
        const singleProduct = {
            barcode: `${sharedBarcode}-SINGLE`, // Unique barcode for database
            name: productName,
            category: category,
            price: parseFloat(singlePrice),
            stock: 100,
            group_barcode: sharedBarcode // Shared barcode for scanning
        };
        
        const singleResponse = await fetch('http://localhost:5008/api/products', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(singleProduct)
        });
        
        if (singleResponse.ok) {
            console.log(`✅ Created ${productName} (single) - ₵${singlePrice}`);
        } else {
            const error = await singleResponse.text();
            console.log(`❌ Failed to create single product: ${error}`);
            return;
        }
        
        // Create bulk pack product
        console.log(`\n📦 Creating ${productName} Pack (bulk)...`);
        const bulkProduct = {
            barcode: `${sharedBarcode}-PACK`, // Unique barcode for database
            name: `${productName} Pack`,
            category: category,
            price: parseFloat(bulkPrice),
            stock: 20,
            group_barcode: sharedBarcode // Same shared barcode
        };
        
        const bulkResponse = await fetch('http://localhost:5008/api/products', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bulkProduct)
        });
        
        if (bulkResponse.ok) {
            console.log(`✅ Created ${productName} Pack (bulk) - ₵${bulkPrice}`);
        } else {
            const error = await bulkResponse.text();
            console.log(`❌ Failed to create bulk product: ${error}`);
            return;
        }
        
        console.log(`\n🎉 SUCCESS! Product variants created with shared barcode: ${sharedBarcode}`);
        console.log(`\n📋 SUMMARY:`);
        console.log(`✅ ${productName} (single) - ₵${singlePrice} - Scan: ${sharedBarcode}`);
        console.log(`✅ ${productName} Pack (bulk) - ₵${bulkPrice} - Scan: ${sharedBarcode}`);
        console.log(`\n🧪 TEST INSTRUCTIONS:`);
        console.log(`1. Go to POS interface`);
        console.log(`2. Type or scan: ${sharedBarcode}`);
        console.log(`3. Choose between single and pack options`);
        
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

addProductVariants();
