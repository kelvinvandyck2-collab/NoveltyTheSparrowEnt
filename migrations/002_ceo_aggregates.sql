-- 002_ceo_aggregates.sql
-- Add indexes and materialized view to support CEO aggregates at scale

-- Indexes for transactions queries (filter by created_at and store_location)
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_store_location ON transactions (store_location);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);

-- Index for purchase_orders by branch
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch ON purchase_orders (branch_id);

-- Index for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_branch ON suppliers (branch_id);

-- Optional materialized view: monthly product sales per branch (run nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_product_sales AS
SELECT
  date_trunc('month', t.created_at) as month,
  COALESCE(t.store_location, 'Main Branch') as branch,
  (item->>'name') as product_name,
  SUM((item->>'qty')::int) as qty_sold,
  SUM((item->>'qty')::int * (item->>'price')::numeric) as revenue
FROM transactions t, jsonb_array_elements(t.items) as item
WHERE t.status = 'completed'
GROUP BY month, branch, product_name;

-- Refresh command (to be run in a nightly job)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_product_sales;

-- Grants (if needed)
-- GRANT SELECT ON mv_monthly_product_sales TO webapp;

-- Notes:
-- 1) For very large datasets, consider daily/hourly incremental aggregation into a lightweight summary table instead of full materialized view refresh.
-- 2) Monitor index bloat and vacuum as needed.
