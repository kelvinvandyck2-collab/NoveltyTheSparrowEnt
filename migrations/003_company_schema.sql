-- Company Users Table
CREATE TABLE IF NOT EXISTS company_users (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proforma Invoices Table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' or 'fixed'
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    markup_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' or 'fixed'
    markup_value DECIMAL(12, 2) DEFAULT 0.00,
    markup_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Sent', 'Accepted', 'Rejected', 'Converted'
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES company_users(id) ON DELETE SET NULL
);

-- Proforma Invoice Items Table
CREATE TABLE IF NOT EXISTS proforma_invoice_items (
    id SERIAL PRIMARY KEY,
    proforma_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (proforma_id) REFERENCES proforma_invoices(id) ON DELETE CASCADE
);

-- Sales Invoices Table
CREATE TABLE IF NOT EXISTS sales_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    proforma_id INTEGER, -- Link to proforma if converted from one
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'percentage',
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    markup_type VARCHAR(20) DEFAULT 'percentage',
    markup_value DECIMAL(12, 2) DEFAULT 0.00,
    markup_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0.00,
    balance_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(50) DEFAULT 'Unpaid', -- 'Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'
    payment_status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (proforma_id) REFERENCES proforma_invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES company_users(id) ON DELETE SET NULL
);

-- Sales Invoice Items Table
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE
);

-- Company Transactions Table
CREATE TABLE IF NOT EXISTS company_transactions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    invoice_id INTEGER,
    transaction_type VARCHAR(50) NOT NULL, -- 'Payment', 'Refund', 'Adjustment'
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(255),
    description TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES company_users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_users_email ON company_users(email);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company ON proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_number ON proforma_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_company ON sales_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_company_transactions_company ON company_transactions(company_id);
