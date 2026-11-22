# L'Asador – Grill & Brew | Business Intelligence & Analytics Guide

## 1. Overview
The Analytics & Reporting engine delivers real-time operational intelligence and financial performance metrics for **L'Asador – Grill & Brew**, Sector 82, JLPL Industrial Area, Mohali, Punjab.

All metrics are aggregated dynamically from production database records—guaranteeing 100% financial accuracy with zero fabricated, estimated, or external cache-drifted statistics.

---

## 2. Core Key Performance Indicators (KPIs)

Accessible at `/admin/analytics` (restricted to `owner`, `admin`, and `manager` roles):

| Metric | Calculation Method | Purpose |
| :--- | :--- | :--- |
| **Gross Revenue** | `SUM(payments.amount)` for all successful settlements | Total cash flow received by the restaurant. |
| **Net Food & Beverage** | `SUM(bills.subtotal)` for all paid bills | Revenue before statutory tax; used for food cost ratio analysis. |
| **Statutory GST Collected** | `SUM(bills.tax_amount)` (5% total: 2.5% CGST + 2.5% SGST) | Statutory tax liability owed to state & central tax authorities. |
| **Total Paid Orders** | Count of distinct orders belonging to settled table sessions | Operational volume indicator. |
| **Average Order Value (AOV)** | `Net Revenue ÷ Total Paid Orders` | Diner spend per transaction; guides menu upselling strategies. |
| **Active Table Sessions** | `COUNT(*) FROM table_sessions WHERE status = 'active'` | Real-time floor occupancy indicator. |

---

## 3. Culinary & Beverage Bestseller Analysis

The analytics engine aggregates product performance across all historical `order_items` where parent orders were not cancelled:

```sql
SELECT 
    p.name AS product_name,
    c.name AS category_name,
    p.prep_station,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.line_subtotal) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY p.name, c.name, p.prep_station
ORDER BY total_quantity DESC
LIMIT 10;
```

### Visual Breakdown:
- **Quantity Leaderboard**: Highlights kitchen volume drivers (e.g. *Truffle Fries*, *Smoked Wings*, *Mohali Blonde Ale*).
- **Revenue Drivers**: Highlights high-margin premium cuts (e.g. *Prime Asador Tomahawk*, *Smoked Brisket Platter*).
- **Station Load Distribution**: Balances prep workloads between Grill Hearth, Fryers, Cold Pantry, and Bar Taps.

---

## 4. Payment Tender Distribution

Tracks diner payment preferences across four supported tenders:
1. **Dynamic UPI**: Rapid mobile QR payment (PhonePe, Google Pay, Paytm).
2. **Credit / Debit Cards**: Visa, Mastercard, RuPay.
3. **Cash**: Traditional currency.
4. **POS EDC Terminal**: Card terminal settlements.

This data allows management to audit cash drawer reconciliation, verify UPI gateway settlements, and optimize card merchant discount rates (MDR).

---

## 5. Export & Financial Audit Trails

- All billing data links directly to immutable `audit_logs` entries.
- Every payment record tracks the exact `processed_by` staff profile ID, timestamp, and tender details.
- Daily reconciliation reports can be generated directly by filtering by date range in PostgreSQL or running end-of-day z-reports.
