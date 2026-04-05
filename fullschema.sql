-- ==========================================
-- 1. CORE SYSTEM & USERS
-- ==========================================

CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id INT PRIMARY KEY,
    branch_id INT UNIQUE DEFAULT 1,
    store_name VARCHAR(255),
    currency_symbol VARCHAR(50),
    vat_rate DECIMAL(5,2),
    receipt_footer TEXT,
    credit_auth_code VARCHAR(50) DEFAULT '123456',
    credit_auth_code_expiry TIMESTAMP,
    monthly_target DECIMAL(12,2) DEFAULT 50000.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50), -- 'admin', 'manager', 'cashier', 'ceo'
    phone VARCHAR(50),
    employee_id VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'Active',
    store_location VARCHAR(100),
    store_id INT,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. INVENTORY & PRODUCTS
-- ==========================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    rating INTEGER DEFAULT 0,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    barcode VARCHAR(50) PRIMARY KEY,
    id SERIAL, -- Internal ID
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    stock_levels JSONB, -- Stores stock per branch e.g. {"Main Warehouse": 10, "Accra Branch": 5}
    selling_unit VARCHAR(50) DEFAULT 'Unit',
    packaging_unit VARCHAR(50) DEFAULT 'Box',
    conversion_rate DECIMAL(10,2) DEFAULT 1,
    reorder_level INTEGER DEFAULT 10,
    track_batch BOOLEAN DEFAULT TRUE,
    track_expiry BOOLEAN DEFAULT TRUE,
    branch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_batches (
    id SERIAL PRIMARY KEY,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE,
    manufactured_date DATE,
    quantity INTEGER DEFAULT 0, -- Current quantity
    quantity_received INTEGER DEFAULT 0, -- Original quantity
    quantity_available INTEGER DEFAULT 0,
    quantity_sold INTEGER DEFAULT 0,
    cost_price DECIMAL(10,2),
    unit_cost DECIMAL(10,2),
    branch_id INTEGER,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_barcode, batch_number, branch_id)
);

CREATE TABLE price_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    list_type VARCHAR(50),
    branch_id INTEGER,
    effective_date DATE,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    markup_percentage DECIMAL(5,2),
    selling_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. SALES & CUSTOMERS
-- ==========================================

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    account_number VARCHAR(10) UNIQUE,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    pending_credit_limit DECIMAL(12, 2),
    status VARCHAR(20) DEFAULT 'Active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    start_cash DECIMAL(10, 2),
    end_cash DECIMAL(10, 2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open'
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    customer_id INTEGER, -- Can be NULL for walk-in
    customer_name VARCHAR(255),
    store_location VARCHAR(100),
    total_amount DECIMAL(10, 2),
    original_total DECIMAL(10, 2),
    current_total DECIMAL(10, 2),
    payment_method VARCHAR(50), -- 'cash', 'momo', 'card', 'credit'
    receipt_number VARCHAR(100),
    items JSONB, -- Array of {barcode, name, qty, price}
    status VARCHAR(20) DEFAULT 'completed',
    is_return BOOLEAN DEFAULT FALSE,
    original_transaction_id INTEGER,
    return_items JSONB,
    has_returns BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refunds (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    original_receipt_number VARCHAR(100),
    refund_receipt_number VARCHAR(100),
    refund_amount DECIMAL(10, 2),
    payment_method VARCHAR(50), -- 'cash', 'momo', etc.
    processed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER
);

CREATE TABLE customer_ledger (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255),
    type VARCHAR(50), -- 'SALE', 'PAYMENT'
    debit DECIMAL(12, 2) DEFAULT 0.00,
    credit DECIMAL(12, 2) DEFAULT 0.00,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    transaction_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    total_discounted DECIMAL(10,2) DEFAULT 0.00,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotion_usage (
    id SERIAL PRIMARY KEY,
    promotion_code VARCHAR(50),
    branch_id INT,
    total_discounted DECIMAL(10,2) DEFAULT 0.00,
    UNIQUE(promotion_code, branch_id)
);

-- ==========================================
-- 4. PROCUREMENT & STOCK CONTROL
-- ==========================================

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Received'
    total_amount DECIMAL(10, 2) DEFAULT 0,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_barcode VARCHAR(50) REFERENCES products(barcode) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL
);

CREATE TABLE goods_received (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id),
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    quantity_received INTEGER,
    quantity_packaging_units INTEGER,
    unit_cost DECIMAL(10,2),
    batch_number VARCHAR(100),
    expiry_date DATE,
    received_by INTEGER,
    invoice_number VARCHAR(100),
    branch_id INTEGER,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfers (
    id SERIAL PRIMARY KEY,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending', -- 'In Transit', 'Received', 'Confirmed'
    items JSONB, -- Legacy support
    branch_id INTEGER,
    confirmed_by INTEGER,
    confirmed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    quantity_sent INTEGER,
    quantity_received INTEGER,
    unit_cost DECIMAL(10,2),
    batch_number VARCHAR(100),
    expiry_date DATE
);

CREATE TABLE stock_adjustments (
    id SERIAL PRIMARY KEY,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    adjustment_type VARCHAR(50), -- 'Damage', 'Theft', 'Correction'
    quantity_adjusted INTEGER,
    reason TEXT,
    approver_id INTEGER,
    branch_id INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_takes (
    id SERIAL PRIMARY KEY,
    stock_take_date DATE,
    branch_id INTEGER,
    created_by INTEGER,
    approved_by INTEGER,
    status VARCHAR(50) DEFAULT 'In Progress',
    variance_total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE stock_take_items (
    id SERIAL PRIMARY KEY,
    stock_take_id INTEGER REFERENCES stock_takes(id) ON DELETE CASCADE,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    physical_count INTEGER,
    system_count INTEGER,
    variance INTEGER,
    variance_reason VARCHAR(255),
    counted_by VARCHAR(100),
    counted_at TIMESTAMP
);

CREATE TABLE reorder_alerts (
    id SERIAL PRIMARY KEY,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    current_stock INTEGER,
    reorder_level INTEGER,
    suggested_quantity INTEGER,
    priority VARCHAR(20), -- 'Critical', 'High', 'Normal'
    status VARCHAR(50) DEFAULT 'Active',
    branch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP
);

-- ==========================================
-- 5. SHELF MANAGEMENT
-- ==========================================

CREATE TABLE shelf_inventory (
    id SERIAL PRIMARY KEY,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    quantity_on_shelf INTEGER DEFAULT 0,
    store_quantity INTEGER DEFAULT 0,
    branch_id INTEGER,
    last_verified TIMESTAMP,
    staff_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_barcode, branch_id)
);

CREATE TABLE shelf_movements (
    id SERIAL PRIMARY KEY,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    movement_type VARCHAR(50), -- 'Store to Shelf'
    quantity INTEGER,
    staff_id INTEGER,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    branch_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. ANALYTICS & LOGS
-- ==========================================

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    branch_id INT DEFAULT 1,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_audit_log (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(100), -- 'Sale', 'Stock In', 'Adjustment'
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    quantity_before INTEGER,
    quantity_after INTEGER,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    user_id INTEGER,
    branch_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_performance (
    id SERIAL PRIMARY KEY,
    product_barcode VARCHAR(50) REFERENCES products(barcode),
    year INTEGER,
    month INTEGER,
    quantity_sold INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    average_daily_sales DECIMAL(10,2) DEFAULT 0,
    classification VARCHAR(50),
    branch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. INDEXES (Performance Optimization)
-- ==========================================

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_ledger_customer_date ON customer_ledger(customer_id, date);
CREATE INDEX idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX idx_batches_product ON product_batches(product_barcode);
CREATE INDEX idx_batches_expiry ON product_batches(expiry_date);
CREATE INDEX idx_audit_log_product ON inventory_audit_log(product_barcode);
