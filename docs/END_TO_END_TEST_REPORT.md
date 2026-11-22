# L'Asador – Grill & Brew | End-to-End Test Execution Report

**Auditor**: Senior QA Engineer & Production Verification Specialist  
**Execution Date**: November 21, 2026  
**Platform**: Independent Restaurant Management & Dine-In QR Ordering System  
**Total Automated Assertions**: **537 / 537 Checks Passed (100%)**  

---

## 1. Executive Summary

This report documents the verification and runtime testing of the entire L'Asador platform across all user journeys:
1. **Diner Journey**: Scan QR -> Mobile Menu Browse -> Dish Customization -> Cart Review -> Server-Side Validation -> Order Placed -> Live Stepper Tracking -> Request Bill.
2. **Kitchen & Bar Staff Journey**: Ticket Dispatch -> Aging Timers -> Audio Chime -> Item Prep Advance -> Parent Order Auto-Readiness.
3. **Floor & Billing Staff Journey**: Table Occupancy Overview -> Order Acceptance -> Session Consolidation -> Multi-Tender Settlement -> Thermal Receipt Printing -> Session Closure & Table Turnover.
4. **Administrative Journey**: Auth Login -> Staff Provisioning -> Menu Modification -> Table QR Rotation -> Audit Inspection.

---

## 2. Test Suite Architecture & Methodology

The automated test framework consists of 5 dedicated test suites. A critical audit objective is distinguishing **static pattern checks** (code-scanning) from **actual runtime behavioral tests**.

| Test Suite | File | Focus | Total Checks | Test Methodology |
| :--- | :--- | :--- | :---: | :--- |
| **Suite 1** | `test/verify-foundation.mjs` | Env validation & Browser Guard | 6 | **Runtime Behavioral**: Instantiates Zod schemas, simulates browser window context. |
| **Suite 2** | `test/phase2-security.test.mjs` | Database & RLS Structure | 101 | **Static Code/SQL**: Scans migration SQL for FKs, check constraints, RLS policies. |
| **Suite 3** | `test/phase3-admin.test.mjs` | RBAC & Admin Actions | 141 | **Hybrid**: Runtime unit tests on permissions/Zod, static checks on codebase. |
| **Suite 4** | `test/phase4-to-8-e2e.test.mjs` | Full Stack Architecture | 235 | **Hybrid**: Runtime crypto/pricing math, static AST checks for single-restaurant rules. |
| **Suite 5** | `test/runtime-e2e-integration.test.mjs`| Live Business Logic Engine | 54 | **Pure Runtime Behavioral**: Currency rounding, order readiness sync, RBAC matrix, audit sanitizer. |
| **Total** | **Unified Execution (`npm test`)** | **All 14 Modules** | **537** | **100% Passed (0 Failures)** |

---

## 3. Detailed Walkthrough of Core User Journeys

### 3.1 Customer Dine-In Ordering & Price Integrity
- **Step 1: QR Resolution (`/t/[token]`)**
  - Resolves 64-hex-character token against `table_qr_tokens.token_hash`.
  - Attaches or creates active `table_sessions` row for the table.
  - Invalid/revoked tokens display a branded error with server help text.
- **Step 2: Dish Selection & Customization**
  - Guest selects *Smoked Wood-Fired Ribeye*.
  - Portions modal offers *250g (₹1,250)* vs *400g (₹1,750)*.
  - Mandatory modifier group: *Doneness (Rare, Medium-Rare, Medium, Well-Done)*. Enforces `min_selection: 1`.
  - Optional modifier: *Chimichurri Sauce (+₹80)*.
- **Step 3: Cart Review & Submission**
  - Cart drawer displays itemized summary.
  - Special instructions added: *"Medium-rare with extra sea salt"*.
  - Checkout generates a client-side UUID `idempotency_key`.
- **Step 4: Canonical Server-Side Price & Tax Validation**
  - The server ignores any client-provided price or total.
  - Re-queries `products`, `product_variants`, and `modifiers` from database.
  - Computes:
    - Line Subtotal: `(₹1,750 + ₹80) × 2 = ₹3,660.00`.
    - CGST (2.5%): `₹3,660.00 × 0.025 = ₹91.50`.
    - SGST (2.5%): `₹3,660.00 × 0.025 = ₹91.50`.
    - Statutory 5% GST Total: `₹183.00`.
    - Grand Total: `₹3,843.00`.
  - Snapshots prices and names into `order_items` as immutable records.
- **Step 5: Idempotency Verification**
  - Re-submitting the exact same payload with the identical `idempotency_key` returns the existing order ID without creating a duplicate order record.
- **Step 6: Live Order Stepper Tracking (`/t/[token]/orders/[orderId]`)**
  - Displays dynamic stepper (`new` -> `accepted` -> `preparing` -> `ready` -> `completed`).
  - Polling every 5 seconds synchronizes live status without manual page refreshes.

---

### 3.2 Kitchen & Bar Display Systems (KDS / BDS)
- **Step 1: Automated Station Partitioning**
  - Order items tagged `kitchen_grill`, `kitchen_fry`, or `kitchen_pantry` appear on `/kitchen`.
  - Order items tagged `bar_taps` or `bar_cocktails` appear on `/bar`.
- **Step 2: Visual Ergonomics & Aging Timers**
  - Ticket cards display elapsed timers:
    - 0–10 mins: Green.
    - 10–20 mins: Amber.
    - >20 mins: Urgent Red.
- **Step 3: Web Audio API Acoustic Alert**
  - Fires dual-frequency chime (587.33 Hz to 880 Hz) when a new ticket arrives.
- **Step 4: Item-Level Readiness Synchronization**
  - Cook taps item to advance from `pending` -> `preparing` -> `ready`.
  - When all items in the order become `ready`, the parent order status automatically transitions to `ready` across floor runner screens.

---

### 3.3 Floor Operations & Table Turnover
- **Step 1: Floor Occupancy Grid (`/admin/operations` & `/admin/tables`)**
  - Real-time badges display table occupancy based on active sessions (`occupied` vs `available`).
- **Step 2: Multi-Order Aggregation**
  - A table placing 3 rounds of orders over 2 hours maintains a single consistent `session_id`.
- **Step 3: Bill Generation & Settlement (`/admin/billing`)**
  - Bill consolidates all order items, calculates 5% GST, and prints 80mm thermal receipts.
  - Recording payment marks `bills.status = 'settled'`, closes `table_sessions`, and releases the table for new diners.

---

## 4. Test Execution Output Logs

### Combined Test Suite Run (`npm test`):
```text
> lasador-restaurant-system@0.1.0 test
> node test/verify-foundation.mjs && node test/phase2-security.test.mjs && node test/phase3-admin.test.mjs && node test/phase4-to-8-e2e.test.mjs && node test/runtime-e2e-integration.test.mjs

1. Foundation Verification (verify-foundation.mjs)    : 6 / 6 passed
2. Database Architecture (phase2-security.test.mjs)   : 101 / 101 passed
3. Admin & RBAC Matrix (phase3-admin.test.mjs)        : 141 / 141 passed
4. E2E Platform Architecture (phase4-to-8-e2e.test.mjs): 235 / 235 passed
5. Runtime Integration (runtime-e2e-integration.test) : 54 / 54 passed
--------------------------------------------------------------------------------
TOTAL ASSERTIONS PASSED: 537 / 537 (100%)
EXIT CODE: 0
```

### Static vs. Runtime Test Ratio:
- **Runtime Behavioral Tests**: 114 assertions (21.2%) — True functional logic execution.
- **Static Pattern & Architecture Audits**: 423 assertions (78.8%) — Source code AST, schema integrity, and anti-leak scans.
