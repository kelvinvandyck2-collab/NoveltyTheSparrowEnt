# Bulk Upload Batch Number & Expiry Date Fix

## Issue
When performing bulk uploads with XLS/XLSX/CSV files containing Batch Number and Expiry Date columns, these fields were not being saved or displayed in the Stock page, and therefore not appearing in the Batch & Expiration Checking page.

## Solution Implemented

### 1. **Server-side Changes** (`server.js`)

#### Updated Bulk Upload Endpoint (`/api/products/bulk`)
- **Line ~1534**: Enhanced the bulk upload handler to:
  - Extract `Batch Number` and `Expiry Date` columns from the uploaded file
  - Parse various date formats (Excel serial numbers, strings like DD/MM/YYYY, YYYY-MM-DD)
  - Create `product_batches` records for each product with batch information
  - Properly handle batch quantity and availability tracking

#### Added Two New API Endpoints
- **GET `/api/batches`**: Fetches all batches in the system
  - Returns batch records with product names
  - Used by frontend to populate batch display in inventory
  
- **POST `/api/batches`**: Create or update batch records
  - Accepts: `product_barcode`, `batch_number`, `expiry_date`, `quantity`, `quantity_available`
  - Checks if batch exists and updates, or creates if new
  - Returns the created/updated batch record

### 2. **Frontend Changes** (`inventory.html`)

#### Updated Stock Table Display
- **Line ~369**: Added two new columns to the stock table header:
  - "Batch Number"
  - "Expiry Date"

#### Updated `renderStockTable()` Function (Line ~1618)
- Now displays batch number and expiry date for each product:
  - Format: Batch Number displays as-is, Expiry Date formatted to locale date string
  - Shows "-" if batch data is not available
- Table now has 9 columns instead of 7 (including the new batch columns)

#### Updated `loadInventory()` Function (Line ~1534)
- Added batch data fetching after loading products:
  - Calls GET `/api/batches` endpoint
  - Maps latest batch to each product based on barcode
  - Populates `batch_number` and `expiry_date` on product objects
  - Gracefully handles if batch endpoint is unavailable

#### Updated `saveProduct()` Function (Line ~1844)
- Enhanced to save batch information when editing products manually:
  - Extracts batch number and expiry date from form fields
  - Creates/updates batch record via POST `/api/batches` endpoint
  - Associates batch with product by barcode

### 3. **Existing Features Verified**
- **Template Download**: Already includes Batch Number and Expiry Date columns with sample data
- **Bulk Upload Process**: Validates and processes files correctly
- **Batch Tracking Tables**: Product batches table properly stores all information

## Data Flow

### For Bulk Upload:
```
XLS/XLSX/CSV File 
    ↓
Server extracts: Product Name, Category, Price, Stock, Batch Number, Expiry Date
    ↓
Creates product record + creates product_batches record
    ↓
Frontend loads inventory and fetches batches
    ↓
Stock page displays product with Batch Number & Expiry Date columns
    ↓
Batch data available for filtering in Batch & Expiration Checking page
```

### For Manual Product Entry:
```
Edit/Add Product Form (includes Batch Number & Expiry Date fields)
    ↓
Save Product → Creates product record + batch record
    ↓
Stock table displays batch info
    ↓
Batch data available for monitoring
```

## How to Use

1. **Download Template**: Click "Download Template" in Bulk Upload
   - Template includes columns: Product Name, Category, Cost, Markup, Price, Current Stock, **Batch Number**, **Expiry Date**, Selling Unit, Packaging Unit, Items per Package, Reorder Level

2. **Fill Template**: Add your products with batch information
   - Example: Batch Number = "B001", Expiry Date = "30/03/2026"

3. **Upload File**: Select XLS/XLSX/CSV and upload
   - System creates products and batch records automatically

4. **View Stock Page**: See new columns showing Batch Number and Expiry Date
   - Use these for quick reference

5. **Monitor on Batch page**: Go to "Shelf & Batches" tab
   - Filter and monitor batch expiry dates
   - System ensures data is properly tracked

## Testing Checklist
- ✓ Server syntax valid
- ✓ Bulk upload extracts batch columns
- ✓ Batch records created in database
- ✓ Stock page displays batch columns
- ✓ Manual product edit saves batch data
- ✓ Batch data flows to batch monitoring page

## Notes
- Batch Number is required for batch record creation
- Expiry Date supports multiple formats (Excel dates, DD/MM/YYYY, YYYY-MM-DD, etc.)
- Latest batch per product is displayed in stock table
- All batch data filterable in Batch & Expiration Checking page
