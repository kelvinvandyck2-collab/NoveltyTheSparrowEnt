# 📚 Complete API Endpoints Reference

## Overview
This document contains all enhanced inventory management API endpoints with detailed specifications.

---

## 1. PRODUCT MANAGEMENT

### Get All Products with Full Details
```
GET /api/products/full
```
Returns all products with batch count and expiry information.

**Response:**
```json
[
  {
    "barcode": "5127999988480",
    "name": "MALTA",
    "category": "Beverages",
    "price": 12.00,
    "cost_price": 8.00,
    "selling_unit": "Bottle",
    "packaging_unit": "Box",
    "conversion_rate": 24,
    "reorder_level": 50,
    "track_batch": true,
    "track_expiry": true,
    "stock": 240,
    "batch_count": 3,
    "next_expiry": "2027-01-15"
  }
]
```

### Create/Update Product
```
POST /api/products
PUT /api/products/:barcode
```

**Request Body:**
```json
{
  "barcode": "5127999988480",
  "name": "MALTA",
  "category": "Beverages",
  "cost_price": 8.00,
  "price": 12.00,
  "selling_unit": "Bottle",
  "packaging_unit": "Box",
  "conversion_rate": 24,
  "reorder_level": 50,
  "track_batch": true,
  "track_expiry": true
}
```

---

## 2. PRICING & PRICELISTS

### Create Pricelist
```
POST /api/pricelists
Content-Type: application/json

{
  "name": "January Standard Pricing",
  "list_type": "Standard",
  "effective_date": "2025-01-15",
  "branch_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

### Get All Pricelists
```
GET /api/pricelists
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "January Standard Pricing",
    "list_type": "Standard",
    "branch_id": 1,
    "effective_date": "2025-01-15",
    "status": "Active",
    "created_at": "2025-01-15T10:30:00Z"
  }
]
```

### Add Items to Pricelist (with Auto-Markup)
```
POST /api/pricelists/:id/items
Content-Type: application/json

{
  "product_barcode": "5127999988480",
  "markup_percentage": 10
}
```

**Auto-Calculation:**
- If cost_price = ₵8.00 and markup = 10%
- Selling price = ₵8.00 × 1.10 = ₵8.80

**Response:**
```json
{
  "success": true,
  "sellingPrice": 8.80
}
```

---

## 3. GOODS RECEIVING

### Receive Goods with Batch Tracking
```
POST /api/goods-received
Content-Type: application/json

{
  "po_id": 1,
  "received_by": 1,
  "branch_id": 1,
  "items": [
    {
      "product_barcode": "5127999988480",
      "quantity_received": 240,
      "quantity_packaging_units": 10,
      "unit_cost": 8.00,
      "batch_number": "LOT20250115",
      "expiry_date": "2026-01-15",
      "invoice_number": "INV-2025-001"
    }
  ]
}
```

**Processing:**
1. Creates goods_received log entry
2. Creates product_batch record (if track_batch=true)
3. Converts packaging units to selling units (10 × 24 = 240)
4. Updates product stock
5. Creates audit log entry
6. Updates PO status to "Received"

**Response:**
```json
{
  "success": true,
  "message": "Goods received successfully"
}
```

---

## 4. SHELF MANAGEMENT

### Move Items to Shelf
```
POST /api/shelf/move
Content-Type: application/json

{
  "product_barcode": "5127999988480",
  "quantity": 50,
  "staff_id": 1,
  "from_location": "Main Warehouse",
  "to_location": "Display Shelf A",
  "branch_id": 1,
  "notes": "Peak hours replenishment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item moved to shelf"
}
```

### Get Shelf Inventory
```
GET /api/shelf/inventory/:branch_id
```

**Response:**
```json
[
  {
    "id": 1,
    "product_barcode": "5127999988480",
    "name": "MALTA",
    "selling_unit": "Bottle",
    "quantity_on_shelf": 50,
    "store_quantity": 190,
    "last_verified": "2025-01-15T14:30:00Z",
    "branch_id": 1
  }
]
```

---

## 5. BATCH & EXPIRY CONTROL (FEFO)

### Get Expiring Batches
```
GET /api/batches/expiring/:days
```

Example: `GET /api/batches/expiring/7` (Next 7 days)

**Response:**
```json
[
  {
    "id": 1,
    "product_barcode": "5127999988480",
    "name": "MALTA",
    "batch_number": "LOT20250115",
    "expiry_date": "2025-01-22",
    "quantity_available": 240,
    "days_to_expiry": 7,
    "status": "Active"
  }
]
```

### Get Next Available Batch (FEFO)
```
GET /api/batches/next/:product_barcode
```

Returns oldest expiring batch with available quantity.

**Response:**
```json
{
  "id": 1,
  "product_barcode": "5127999988480",
  "batch_number": "LOT20250115",
  "expiry_date": "2025-01-22",
  "quantity_available": 240,
  "unit_cost": 8.00,
  "status": "Active"
}
```

---

## 6. STOCK ADJUSTMENTS

### Create Stock Adjustment
```
POST /api/stock-adjustments
Content-Type: application/json

{
  "product_barcode": "5127999988480",
  "adjustment_type": "Damage",
  "quantity_adjusted": -5,
  "reason": "Damaged bottles in delivery",
  "approver_id": 1,
  "branch_id": 1,
  "user_id": 2
}
```

**Adjustment Types:**
- `Damage` - Damaged goods
- `Theft` - Missing stock
- `Counting Error` - Inventory discrepancy
- `Expiry Write-off` - Expired items

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

---

## 7. STOCK TAKING

### Start Stock Take
```
POST /api/stock-takes
Content-Type: application/json

{
  "branch_id": 1,
  "created_by": 1
}
```

**Response:**
```json
{
  "success": true,
  "id": 1
}
```

### Record Stock Count Item
```
POST /api/stock-takes/:id/items
Content-Type: application/json

{
  "product_barcode": "5127999988480",
  "physical_count": 235,
  "counted_by": "John Doe"
}
```

**Processing:**
1. Gets system count from database
2. Calculates variance (physical - system)
3. Records counting details

**Response:**
```json
{
  "success": true,
  "variance": -5
}
```

### Approve Stock Take
```
POST /api/stock-takes/:id/approve
Content-Type: application/json

{
  "approved_by": 1
}
```

**Processing:**
1. Applies all variances to product stock
2. Creates audit log for each variance
3. Calculates total variance
4. Updates stock_take status to "Approved"

**Response:**
```json
{
  "success": true,
  "message": "Stock take approved"
}
```

---

## 8. REORDER ALERTS

### Check and Generate Alerts
```
POST /api/reorder/check
Content-Type: application/json

{
  "branch_id": 1
}
```

**Processing:**
- Finds all products where stock ≤ reorder_level
- Creates/updates reorder_alerts entries
- Sets priority (Critical/High/Normal)
- Suggests reorder quantity (reorder_level × 2)

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "barcode": "5127999988480",
      "name": "MALTA",
      "stock": 30,
      "reorder_level": 50,
      "priority": "High",
      "suggested_quantity": 100
    }
  ]
}
```

### Get Active Reorder Alerts
```
GET /api/reorder/alerts/:branch_id
```

**Response:**
```json
[
  {
    "id": 1,
    "product_barcode": "5127999988480",
    "name": "MALTA",
    "selling_unit": "Bottle",
    "current_stock": 30,
    "reorder_level": 50,
    "suggested_quantity": 100,
    "priority": "High",
    "status": "Active"
  }
]
```

---

## 9. STOCK DISTRIBUTION (TRANSFERS)

### Confirm Transfer Receipt
```
POST /api/transfers/:id/confirm
Content-Type: application/json

{
  "confirmed_by": 1,
  "items_received": [
    {
      "id": 1,
      "quantity_received": 240
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transfer confirmed"
}
```

---

## 10. REPORTS & ANALYTICS

### Low Stock Report
```
GET /api/reports/low-stock/:branch_id
```

**Response:**
```json
[
  {
    "barcode": "5127999988480",
    "name": "MALTA",
    "category": "Beverages",
    "stock": 30,
    "reorder_level": 50,
    "shortage": 20,
    "stock_percentage": 60.00
  }
]
```

### Expiry Report
```
GET /api/reports/expiry/:branch_id
```

**Response:**
```json
[
  {
    "id": 1,
    "product_barcode": "5127999988480",
    "name": "MALTA",
    "batch_number": "LOT20250115",
    "expiry_date": "2025-01-22",
    "quantity_available": 240,
    "days_to_expiry": 7,
    "status": "Expiring Soon"
  }
]
```

### Product Performance (Fast/Slow Moving)
```
GET /api/reports/performance/:branch_id/:year/:month
```

Example: `GET /api/reports/performance/1/2025/1`

**Response:**
```json
[
  {
    "barcode": "5127999988480",
    "name": "MALTA",
    "category": "Beverages",
    "quantity_sold": 850,
    "revenue": 10200.00,
    "classification": "Fast Moving",
    "current_stock": 240
  }
]
```

### Stock Summary
```
GET /api/reports/stock-summary/:branch_id
```

**Response:**
```json
{
  "total_products": 45,
  "total_units": 5280,
  "total_cost_value": 32000.00,
  "total_retail_value": 58000.00,
  "out_of_stock_count": 2,
  "low_stock_count": 8
}
```

---

## 11. POS INTEGRATION

### Get Product for POS (with FEFO)
```
GET /api/pos/product/:barcode
```

**Response:**
```json
{
  "barcode": "5127999988480",
  "name": "MALTA",
  "price": 12.00,
  "stock": 235,
  "selling_unit": "Bottle",
  "track_batch": true,
  "batches": [
    {
      "id": 1,
      "batch_number": "LOT20250115",
      "expiry_date": "2025-01-22",
      "quantity_available": 235
    }
  ]
}
```

### Process POS Sale with Batch Tracking
```
POST /api/pos/sale/:barcode
Content-Type: application/json

{
  "quantity": 1,
  "batch_id": 1,
  "user_id": 1,
  "branch_id": 1
}
```

**Processing:**
1. Checks stock availability
2. Updates batch quantity (sold/available)
3. Updates product stock
4. Creates audit log
5. Returns remaining stock

**Response:**
```json
{
  "success": true,
  "remaining_stock": 234
}
```

---

## Error Handling

All endpoints return proper HTTP status codes:

```
200 OK        - Request successful
400 Bad Request - Invalid input
404 Not Found - Resource not found
500 Server Error - Database/system error
```

**Error Response Format:**
```json
{
  "message": "Error description",
  "error": "Additional details (development only)"
}
```

---

## Authentication

All endpoints require session authentication. Include session cookie:
```
Cookie: pos.sid=<session_id>
```

---

## Rate Limiting

- 1000 requests per 15 minutes per IP
- Applied to all endpoints

---

## Data Validation

### Barcode
- VARCHAR(50)
- Cannot be empty
- Must be unique per product

### Quantity
- Must be positive integer
- Cannot exceed available stock

### Dates
- Format: YYYY-MM-DD
- Cannot be in past for future operations

### Unit Conversion
- Must be positive decimal
- Minimum: 0.01

---

## Best Practices

1. **Always check stock before sale**: Use GET /api/pos/product/:barcode
2. **Track batches for perishables**: Set track_batch & track_expiry to true
3. **Set appropriate reorder levels**: Prevent stockouts
4. **Regular stock takes**: Monthly minimum
5. **Monitor expiry dates**: Check weekly
6. **Audit trail review**: Track suspicious adjustments

---

## Example Integration Flow

```javascript
// 1. Create Product
POST /api/products {
  barcode, name, cost_price, price,
  selling_unit, packaging_unit, conversion_rate,
  reorder_level, track_batch, track_expiry
}

// 2. Create PO
POST /api/purchase-orders {
  supplier_id, items[]
}

// 3. Receive Goods
POST /api/goods-received {
  po_id, items[], received_by
}

// 4. Get POS Product
GET /api/pos/product/:barcode

// 5. Process Sale
POST /api/pos/sale/:barcode {
  quantity, batch_id, user_id
}

// 6. Monitor
GET /api/reports/low-stock/:branch_id
GET /api/reports/expiry/:branch_id
GET /api/reorder/alerts/:branch_id
```

---

**API Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Production Ready ✅
