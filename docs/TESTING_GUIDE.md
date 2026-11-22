# L'Asador – Grill & Brew | Quality Assurance & Testing Guide

## 1. Overview
The **L'Asador – Grill & Brew** quality assurance framework comprises 4 comprehensive automated test suites delivering **477+ automated assertions** across environment security, PostgreSQL schemas, Row Level Security, RBAC authorization, QR cryptography, pricing integrity, KDS/BDS dispatching, billing settlement, and single-restaurant isolation.

---

## 2. Test Suite Architecture

| Test Suite File | Focus Area | Checks | Command |
| :--- | :--- | :---: | :--- |
| `test/verify-foundation.mjs` | Environment validation & browser-guard security | 6 | `npm run test:phase1` |
| `test/phase2-security.test.mjs` | Database architecture, 22 tables, RLS policies, FK constraints | 101 | `npm run test:phase2` |
| `test/phase3-admin.test.mjs` | Auth, RBAC permissions, staff actions, settings, audit logging | 141 | `npm run test:phase3` |
| `test/phase4-to-8-e2e.test.mjs` | E2E simulation: Menu, QR, Orders, KDS, BDS, Floor, Billing, PWA | 235 | `npm run test:e2e` |
| **Combined Test Suite** | **All 4 suites in unified execution** | **477+** | **`npm test`** |

---

## 3. Running Test Suites

### 3.1 Running the Full Automated Suite
```bash
npm test
```
Executes all 4 suites sequentially. Exits with code 0 on complete pass; stops on any failure.

### 3.2 Running Individual Test Suites
```bash
# Phase 1: Foundation & Security Boundary
node test/verify-foundation.mjs

# Phase 2: PostgreSQL Schema, Foreign Keys & RLS Audit
node test/phase2-security.test.mjs

# Phase 3: Admin Foundation & RBAC Matrix
node test/phase3-admin.test.mjs

# Phases 4–8: Complete E2E Integration & Single-Restaurant Isolation
node test/phase4-to-8-e2e.test.mjs
```

### 3.3 TypeScript Type Verification
```bash
npm run type-check
```
Executes `tsc --noEmit`. Compiles all TypeScript files in `src/` against `tsconfig.json`. Ensures zero type mismatches or missing properties.

### 3.4 ESLint Static Code Analysis
```bash
npm run lint
```
Executes `next lint`. Verifies compliance with Next.js Core Web Vitals, React Hooks dependencies, and clean code formatting.

### 3.5 Next.js Production Build Verification
```bash
npm run build
```
Creates an optimized production build (`.next`), tree-shaking server actions, bundling client chunks, and pre-rendering static routes.

---

## 4. Key Security & Functional Test Verifications

### 4.1 Browser-Guard Enforcement (`verify-foundation.mjs`)
Simulates invoking `createAdminClient()` within a browser window context. Confirms that the runtime immediately throws a security violation error, preventing `SUPABASE_SERVICE_ROLE_KEY` leakage.

### 4.2 Row Level Security (RLS) Policy Audit (`phase2-security.test.mjs`)
Validates that `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` is present for all 22 database tables and that recursion-free security definer functions are deployed.

### 4.3 RBAC Permission Matrix Audit (`phase3-admin.test.mjs`)
Tests role hierarchy:
- `owner`: 19/19 permissions (full access).
- `admin`: 18/19 permissions (all except `restaurant:delete`).
- `manager`: 13/19 permissions (floor ops, staff view, menu, tables, billing).
- `kitchen`: 2/19 permissions (`kitchen:view`, `kitchen:update`).
- `bar`: 2/19 permissions (`bar:view`, `bar:update`).

### 4.4 Financial & GST Arithmetic (`phase4-to-8-e2e.test.mjs`)
Validates that:
- Line subtotal = `(unit_price + modifier_prices) × quantity`.
- CGST = `subtotal × 0.025` (2.5%).
- SGST = `subtotal × 0.025` (2.5%).
- Total GST = 5.0%.
- Grand Total = `subtotal + CGST + SGST`.
- Calculation is strictly executed server-side.

### 4.5 Single-Restaurant Isolation Scan (`phase4-to-8-e2e.test.mjs`)
Scans all source files in `src/` to verify:
- Zero references to `tenant_id` or `organization_id`.
- Zero references to TableTap credentials, URLs, or databases.
