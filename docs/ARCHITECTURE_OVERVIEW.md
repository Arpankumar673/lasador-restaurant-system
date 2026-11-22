# L'Asador – Grill & Brew | Architecture Overview
**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Single-Restaurant Dedicated Ordering & Operations Platform  
**Document Version:** 1.0.0 (Phase 1 Foundation)  
**Date:** November 2026  

---

## 1. Executive Summary & Independence Mandate

L'Asador – Grill & Brew is an artisanal wood-fired steakhouse and in-house craft microbrewery operating in Mohali, Punjab.

### Critical Independence Rule
This project is an **independent, bespoke, single-restaurant system**.
- **Zero Tenant Abstraction:** It does NOT contain `tenant_id`, multi-tenant routing, multi-restaurant switching, organization tiers, SaaS billing, or subscription management.
- **Zero Inheritance from TableTap:** It does NOT share code, repositories, Supabase instances, databases, authentication users, environment variables, API credentials, or cloud hosting with TableTap or any other system.
- **Dedicated Infrastructure:** All schemas, authentication roles, storage buckets, and secrets are exclusively provisioned for L'Asador.

---

## 2. Technology Stack Selection

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14+ (App Router)** | High-performance React framework with server-side rendering, streaming, server actions, and route handlers. |
| **Language** | **TypeScript 5 (Strict Mode)** | End-to-end type safety, preventing runtime errors across API boundaries and database query results. |
| **Styling & Design** | **Tailwind CSS + Custom Tokens** | Utility-first styling with dedicated L'Asador design tokens (charcoal embers, malt gold, brewery copper). |
| **Iconography & Motion** | **Lucide React + Framer Motion** | Accessible, consistent iconography and performant micro-interactions. |
| **Backend & Services** | **Next.js Server Actions & Route Handlers** | Secure, server-side execution of business logic, avoiding exposure of sensitive operations to the client. |
| **Data Validation** | **Zod** | Runtime validation for environment variables, API payloads, order submissions, and table QR tokens. |
| **Database & Auth** | **Dedicated Supabase (PostgreSQL + RLS)** | Managed PostgreSQL with native Row Level Security (RLS), Supabase Auth, and real-time streaming capabilities. |
| **SSR Supabase Integration** | **`@supabase/ssr`** | Cookie-based session management compatible with Next.js App Router and Server Components. |

---

## 3. High-Level Architectural Diagram

```
+-----------------------------------------------------------------------------------+
|                            GUEST BROWSING & QR INTERFACE                         |
|                           (Mobile Safari / Chrome on iOS/Android)                 |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTPS / Cookie Auth / Public Tokens
                                          v
+-----------------------------------------------------------------------------------+
|                        NEXT.JS APP ROUTER RUNTIME (EDGE & NODE)                  |
|                                                                                   |
|   +-----------------------+   +------------------------+   +------------------+   |
|   |   (public) Route      |   |      (admin) Route     |   |    API Routes    |   |
|   | - Guest Landing       |   | - Operations Console   |   | - /api/health    |   |
|   | - Story & Microbrewery|   | - KDS / BDS Boards     |   | - Server Actions |   |
|   | - QR Entry Point      |   | - Menu & Table Config  |   | - Webhooks       |   |
|   +-----------+-----------+   +-----------+------------+   +--------+---------+   |
|               |                           |                         |             |
|               +---------------------+     |     +-------------------+             |
|                                     |     |     |                                 |
|                                     v     v     v                                 |
|                    +------------------------------------+                         |
|                    |     Next.js Supabase Middleware    |                         |
|                    |     - Session Refreshing           |                         |
|                    |     - Token Synchronization        |                         |
|                    +------------------+-----------------+                         |
+---------------------------------------|-------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | (Client Cookie / Anon)                      | (Server-Only Service Role)
                 v                                             v
+-----------------------------------------------------------------------------------+
|                        DEDICATED SUPABASE (POSTGRESQL INSTANCE)                   |
|                                                                                   |
|  - Auth Schema (Staff Users: Admin, Manager, Kitchen, Bar, Waiter)                |
|  - Public Schema (Profiles, Restaurant Settings, Categories, Products, Tables)   |
|  - PostgreSQL RLS Policies (Row-Level Security guarding all tables)               |
|  - Native Database Extensions: pgcrypto, uuid-ossp                                |
|  - Timezone: Asia/Kolkata (IST)                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 4. Security Architecture

1. **Client vs Server Key Boundary:**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public and restricted by PostgreSQL Row Level Security (RLS).
   - `SUPABASE_SERVICE_ROLE_KEY` is strictly server-only. It is validated via `getServerEnv()` and throws an immediate exception if imported or referenced in client-side code.
2. **Environment Variable Enforcement:**
   - Validated at startup using Zod schemas (`src/lib/validations/env.ts`).
   - Placeholder fallbacks are allowed during initial build verification, but strict enforcement blocks production execution if real credentials are missing.
3. **No Guest Privileged Writes:**
   - Guests never write directly to sensitive database tables (orders, bills, staff profiles).
   - All state mutations flow through validated Server Actions and database RPCs.

---

## 5. Station Routing Model

To support L'Asador's dual grill and microbrewery kitchen, items are categorized into dedicated preparation stations:

- **`kitchen_grill`:** Live-fire wood hearth (dry-aged steaks, chops, skewers, smoked sausages).
- **`kitchen_fry`:** Fryer and sauté line (appetizers, artisanal potato fries, roasted vegetables).
- **`kitchen_pantry`:** Cold pantry (burrata, salads, cured meats, sourdough, desserts).
- **`bar_taps`:** Microbrewery draft lines (in-house craft beers poured fresh from cold taps).
- **`bar_cocktails`:** Mixology station (signature smoked cocktails, spirits, mocktails).
