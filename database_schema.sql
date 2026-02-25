-- 1. Customers Table (Stores client details and current balance)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    current_balance DECIMAL(12, 2) DEFAULT 0.00, -- Positive value means they owe money
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer Ledger (Tracks history for Statements)
-- This table records every event that changes a customer's balance
CREATE TABLE IF NOT EXISTS customer_ledger (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(255), -- e.g., "Credit Sale - Receipt #1001" or "Payment Received"
    type VARCHAR(50), -- 'SALE', 'PAYMENT', 'ADJUSTMENT', 'OPENING_BALANCE'
    
    -- Financials
    debit DECIMAL(12, 2) DEFAULT 0.00,  -- Amount added to debt (Sales)
    credit DECIMAL(12, 2) DEFAULT 0.00, -- Amount reduced from debt (Payments)
    balance DECIMAL(12, 2) DEFAULT 0.00, -- Running balance snapshot after this transaction
    
    transaction_id INTEGER, -- Optional: Link to the main sales_transactions table if exists
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for faster statement generation
CREATE INDEX idx_ledger_customer_date ON customer_ledger(customer_id, date);