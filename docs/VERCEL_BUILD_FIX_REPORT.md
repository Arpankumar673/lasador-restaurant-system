# L'Asador – Grill & Brew | Vercel Deployment & Build Remediation Report

**Date:** 2026-11-22  
**Platform:** Next.js 14 App Router (Tailwind CSS, PostCSS, Autoprefixer)  
**Target Environment:** Vercel Production Build (`iad1`)  
**Repository:** [https://github.com/Arpankumar673/lasador-restaurant-system](https://github.com/Arpankumar673/lasador-restaurant-system)  

---

## 1. Root Cause Analysis

### A. Missing `browserslist` in Clean Production Installs
During Next.js webpack compilation of CSS (`src/app/globals.css`), Next.js invokes `postcss-loader` and `autoprefixer`.  
`autoprefixer` relies directly on the `browserslist` runtime module to determine vendor-prefix target matrices.

In standard CI/CD deployment pipelines (such as Vercel) where `npm ci` or `NODE_ENV=production` is executed:
1. `browserslist` was previously nested only as an indirect transitive dependency rather than an explicit top-level package.
2. If `NODE_ENV=production` is set by the hosting container during `npm install`, npm ignores or prunes `devDependencies`. Because `tailwindcss`, `postcss`, and `autoprefixer` were listed under `devDependencies`, their peer-dependencies and binary hooks could not be resolved by webpack's isolated worker processes (`processChild.js`), throwing:
   ```
   Error: Cannot find module 'browserslist'
   Require stack:
   - /vercel/path0/node_modules/autoprefixer/lib/autoprefixer.js
   - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
   - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
   ```

### B. Vercel Redeployment Behavior
When clicking the "Redeploy" button on an existing failed deployment inside Vercel, Vercel rebuilds the **exact historical commit** associated with that deployment record (`af087de`) rather than the latest commit from `main`. A new commit or deployment trigger from the project dashboard is required to checkout the fixed dependency tree.

---

## 2. Dependency Remediation

1. **Promoted CSS Pipeline to Production Dependencies:**
   - Moved `tailwindcss` (`^3.4.15`), `postcss` (`^8.4.49`), `autoprefixer` (`^10.4.20`), and `browserslist` (`^4.29.6`) into `"dependencies"` in `package.json`.
   - This guarantees that even in strict `NODE_ENV=production` container environments, the entire styling and prefixing toolchain is preserved.
2. **Lockfile Synchronization:**
   - Regenerated `package-lock.json` using `npm install`.
   - Verified that `node_modules/browserslist` is explicitly declared and deduped at the root level of `package-lock.json`.
3. **No Breaking Upgrades:**
   - Preserved all other existing versions (Next.js 14.2.18, React 18.3.1, Supabase SSR 0.5.2, Zod 3.23.8).

---

## 3. Local Verification Results

### 1. `npm ci` (Clean Install Verification)
- **Result:** Succeeded.
- **Packages Audited:** 409 packages installed with lockfileVersion 3.
- **Package Tree Check:**
  ```
  lasador-restaurant-system@0.1.0 C:\Projects\LAsador-Restaurant-System
  +-- autoprefixer@10.6.2
  | +-- browserslist@4.29.6 deduped
  | `-- postcss@8.5.33 deduped
  +-- browserslist@4.29.6
  | `-- update-browserslist-db@1.4.0
  |   `-- browserslist@4.29.6 deduped
  +-- next@14.2.35
  | `-- postcss@8.4.31
  +-- postcss@8.5.33
  `-- tailwindcss@3.4.19
  ```

### 2. `npm run type-check`
- **Result:** Succeeded (Exit code 0).
- **Output:**
  ```
  > lasador-restaurant-system@0.1.0 type-check
  > tsc --noEmit
  ```

### 3. `npm run lint`
- **Result:** Succeeded (Exit code 0).
- **Output:**
  ```
  > lasador-restaurant-system@0.1.0 lint
  > next lint

  ✔ No ESLint warnings or errors
  ```

### 4. `npm run build` (Next.js Production Build)
- **Result:** Succeeded (Exit code 0).
- **Output:**
  ```
  ▲ Next.js 14.2.35
  - Environments: .env.local

  Creating an optimized production build ...
  ✓ Compiled successfully
  Linting and checking validity of types ...
  Collecting page data ...
  ✓ Generating static pages (21/21)
  Finalizing page optimization ...
  Collecting build traces ...

  Route (app)                              Size     First Load JS
  ┌ ○ /                                    181 B          96.2 kB
  ├ ○ /_not-found                          153 B          87.5 kB
  ├ ƒ /admin                               181 B          96.2 kB
  ├ ƒ /admin/analytics                     3.57 kB        98.1 kB
  ├ ƒ /admin/audit-logs                    5.34 kB        99.9 kB
  ├ ƒ /admin/bar                           153 B          87.5 kB
  ├ ƒ /admin/billing                       6.26 kB         101 kB
  ├ ƒ /admin/forgot-password               3.26 kB         107 kB
  ├ ƒ /admin/kitchen                       153 B          87.5 kB
  ├ ƒ /admin/login                         3.72 kB         107 kB
  ├ ƒ /admin/menu                          9.94 kB         104 kB
  ├ ƒ /admin/operations                    5.83 kB         100 kB
  ├ ƒ /admin/orders                        153 B          87.5 kB
  ├ ƒ /admin/reset-password                3.31 kB         107 kB
  ├ ƒ /admin/settings                      5.33 kB        99.9 kB
  ├ ƒ /admin/staff                         5.89 kB         100 kB
  ├ ƒ /admin/tables                        139 kB          233 kB
  ├ ƒ /api/health                          0 B                0 B
  ├ ƒ /bar                                 4.41 kB          99 kB
  ├ ƒ /kitchen                             4.51 kB        99.1 kB
  ├ ƒ /t/[token]                           6.99 kB         102 kB
  └ ƒ /t/[token]/orders/[orderId]          4.33 kB        98.9 kB
  + First Load JS shared by all            87.3 kB

  ƒ Middleware                             101 kB
  ```

---

## 4. Modified Files

| File | Change |
| :--- | :--- |
| `package.json` | Promoted `tailwindcss`, `postcss`, `autoprefixer`, and `browserslist` to production `dependencies`. |
| `package-lock.json` | Re-indexed root dependency tree with top-level `browserslist` deduplication. |
| `docs/VERCEL_BUILD_FIX_REPORT.md` | Comprehensive remediation report. |
