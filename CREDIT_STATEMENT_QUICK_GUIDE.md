# Credit Statement - Quick Reference Guide

## What It Does ✅
Generates professional password-protected PDF bank statements for credit customers, showing:
- ✓ Transaction history (sales & payments)
- ✓ Item-level details (what they bought, quantities, prices)
- ✓ Opening & closing balances
- ✓ Credit limit vs. amount used vs. available credit
- ✓ Running balance throughout the month

## How to Generate a Statement

### Step 1: Open Credit Customers Page
```
Menu → Credit Customers
```

### Step 2: Find the Customer
Search or scroll to find the customer (e.g., "Kelvin Van-Dyck")

### Step 3: Click Statement Button
Click the "📊 Generate Statement" button on the customer row

### Step 4: Select Month & Year
- Month: Drop-down (1-12)
- Year: Defaults to current year
- Click "Generate & Send"

### Step 5: Confirmation
You'll see:
```
✅ Statement emailed successfully to kelvin@example.com
```

The customer will receive the PDF via email with:
- Unique 8-digit password
- Professional formatting
- All transaction details
- Items purchased

## What the Customer Sees

### PDF Document
```
CUSTOMER STATEMENT - January 2026

ACCOUNT DETAILS
├─ Name: Kelvin Van-Dyck
├─ Account: #14
├─ Phone: +233 5XX XXX XXX
└─ Date: 26/01/2026

CREDIT & STATEMENT SUMMARY
├─ Credit Limit: GHS 10,000.00
├─ Amount Used: GHS 7,500.00 ⚠️ (in red)
├─ Available Credit: GHS 2,500.00 ✅ (in green)
└─ PDF Password: 12345678

TRANSACTION DETAILS
Date      | Description           | Debit      | Credit  | Balance
──────────┼───────────────────────┼────────────┼─────────┼──────────
01/01     | Opening Balance       |            |         | GHS 5,000
          |
15/01     | Sale - CREDIT-123     | GHS 2,000  |         | GHS 7,000
          | └─ Coca-Cola (1 case) |            |         |
          | │  1x @ GHS 600       |            |         | GHS 600
          | └─ Fanta (1 case)     |            |         |
          │  1x @ GHS 400         |            |         | GHS 400
          | ... and 2 more items  |            |         |
          |
20/01     | Payment Received      |            | GHS 1,000| GHS 6,000

CLOSING BALANCE: GHS 6,000 (in yellow - amount owed)
```

### Email Message
```
Subject: Account Statement - January 2026

Dear Kelvin Van-Dyck,

Please find attached your account statement for January 2026.

Credit Limit: GHS 10,000.00
Amount Used: GHS 7,500.00
Available Credit: GHS 2,500.00

🔐 PDF Password (Unique to this statement): 12345678

If you have any questions regarding your statement...

Regards,
Footprint Retail Systems
```

## Important Features

### 🔐 Password Protection
- Each PDF has a unique 8-digit password
- Password is shown in the email for customer convenience
- Prevents unauthorized access
- Example password: `45623891`

### 🟡 Balance Color Coding
- **Yellow** = Amount owed (positive balance)
- **Green** = Paid in full / credit balance (zero or negative)

### 📋 Item Details
Every sale shows:
- What items were purchased
- Quantity (e.g., "1x @ GHS 600")
- Unit price
- Item total

If transaction has >3 items: "...and 2 more items" (summary)

### 📊 Credit Summary
Shows at top of statement:
- Total credit limit allowed
- How much they've used (in red if high)
- How much credit is still available (in green)

## Data Shown

### Opening Balance
Calculated from ALL transactions and payments BEFORE this month:
```
Opening Balance = (All sales before this month) - (All payments before this month)
```

### Running Balance
Updated after each transaction:
```
Running Balance = Previous Balance + New Sale - Payment Received
```

### Closing Balance
Final balance at end of month:
```
Closing Balance = Final Running Balance
= Opening Balance + All Month's Sales - All Month's Payments
```

## Error Messages

| Message | What to Do |
|---------|-----------|
| "Customer not found" | Verify customer exists |
| "Customer has no email" | Add email to customer profile |
| "Invalid month" | Choose month 1-12 |
| "SMTP error" | Check email configuration |
| "Transactions found: 0" | This is OK - just means customer had no sales/payments this month |

## Console Debugging

If you need to debug, check browser console (F12 → Console tab):

```
📧 Starting email-statement request for customer ID: 14
📅 Statement Request - Customer ID: 14 | Month: 1 | Year: 2026
👤 Customer: Kelvin Van-Dyck | ID: 14
🔍 Opening Balance Calculated: 3500
📋 ALL CREDIT TRANSACTIONS FOR CUSTOMER: 2
📨 Preparing email for: kelvin@example.com
📄 PDF Size: 45.32 KB
✅ Email sent successfully!
```

## Examples

### Example 1: Fresh Credit Customer
```
Opening Balance: GHS 0.00
01/15: Sale GHS 1,500 → Balance: GHS 1,500
Closing: GHS 1,500 owed
```

### Example 2: Regular Customer
```
Opening Balance: GHS 5,000 (from previous month)
01/10: Sale GHS 500 → Balance: GHS 5,500
01/20: Payment GHS 2,000 → Balance: GHS 3,500
Closing: GHS 3,500 owed
```

### Example 3: Paid-Up Customer
```
Opening Balance: GHS 2,000
01/15: Payment GHS 2,000 → Balance: GHS 0
Closing: GHS 0 (paid in full) ✅
```

## Tips & Tricks

✅ **Best Practice**: Generate statements monthly on a fixed date (e.g., 1st of month)

✅ **Bulk Statements**: Generate for multiple customers by clicking each one

✅ **Customer Verification**: Share the unique PDF password verbally/separately for security

✅ **Archive**: Save emailed statements for accounting records

✅ **Follow-ups**: For high balances (>credit limit), follow up with payment reminder

## Troubleshooting Checklist

- [ ] Customer email is correctly entered in profile
- [ ] Month is between 1-12
- [ ] Year is reasonable (2020 or later)
- [ ] Customer has had credit sales (not just cash transactions)
- [ ] Email server is configured (.env SMTP settings)
- [ ] Check browser console (F12) for detailed error messages
- [ ] Verify customer has credit transactions in database

## Who Can Access?

- ✅ Admin users
- ✅ Manager users
- ✅ Users with "Email" permission
- ❌ Regular staff
- ❌ Customers (protected by JWT authentication)

## Database Fields Used

```
customers:
├─ id
├─ name
├─ email
├─ credit_limit
└─ current_balance

transactions:
├─ id
├─ customer_name (NULL for cash)
├─ created_at
├─ total_amount
├─ items (JSONB array)
├─ payment_method
└─ status

customer_payments:
├─ id
├─ customer_id
├─ amount
└─ payment_date
```

## API Details (For Developers)

```
POST /api/customers/:id/email-statement
Headers: Authorization: Bearer {JWT_TOKEN}
Body: { "month": 1, "year": 2026 }
Response: { "success": true, "message": "...", "details": {...} }
```

---
**Last Updated**: January 26, 2026 | **Status**: ✅ Production Ready
