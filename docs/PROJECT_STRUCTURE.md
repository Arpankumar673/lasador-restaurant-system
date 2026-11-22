# L'Asador – Grill & Brew | Project Structure
**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Single-Restaurant Dedicated Architecture  
**Document Version:** 1.0.0 (Phase 1 Foundation)  

---

## 1. Directory Tree

```
c:\Projects\LAsador-Restaurant-System\
├── docs/                                 # Architectural & project documentation
│   ├── 01_LAsador_PRD.docx               # Product Requirements Document
│   ├── 02_LAsador_TRD.docx               # Technical Requirements Document
│   ├── 03_LAsador_Database_Architecture.docx # Database Architecture Blueprint
│   ├── 04_LAsador_Development_Roadmap.docx # Development Roadmap
│   ├── ARCHITECTURE_OVERVIEW.md          # Architectural boundaries & diagrams
│   ├── ENVIRONMENT_SETUP.md              # Instructions for local & production env
│   ├── PHASE_1_IMPLEMENTATION_REPORT.md  # Detailed verification of Phase 1
│   └── PROJECT_STRUCTURE.md             # This document
│
├── supabase/                             # Dedicated Supabase migrations & config
│   └── migrations/                       # PostgreSQL SQL migrations
│       └── 20261119000000_phase1_initial_setup.sql # Extensions & timezone setup
│
├── src/
│   ├── app/                              # Next.js App Router root
│   │   ├── (public)/                     # Guest-facing route group
│   │   │   ├── layout.tsx                # Guest layout (PublicHeader, PublicFooter)
│   │   │   └── page.tsx                  # L'Asador brand landing page
│   │   ├── (admin)/                      # Staff & admin operational route group
│   │   │   └── admin/
│   │   │       ├── layout.tsx            # Admin layout (AdminHeader, AdminSidebar)
│   │   │       └── page.tsx              # Operations console overview
│   │   ├── api/                          # Server API routes
│   │   │   └── health/
│   │   │       └── route.ts              # System health & env diagnostic endpoint
│   │   ├── layout.tsx                    # Root document layout & font configuration
│   │   ├── globals.css                   # Global styles & design token variables
│   │   ├── loading.tsx                   # Branded loading state
│   │   ├── error.tsx                     # Branded error boundary
│   │   └── not-found.tsx                 # Branded 404 page
│   │
│   ├── components/                       # Reusable UI component library
│   │   ├── ui/                           # Primitive components
│   │   │   ├── button.tsx                # Button variants (ember, flame, copper, malt)
│   │   │   ├── card.tsx                  # Card, CardHeader, CardTitle, CardContent
│   │   │   ├── badge.tsx                 # Badges (ember, malt, hops, copper)
│   │   │   ├── input.tsx                 # Form text input
│   │   │   └── container.tsx             # Responsive layout container
│   │   ├── layout/                       # Structural layout components
│   │   │   ├── public-header.tsx         # Responsive guest header & navigation
│   │   │   ├── public-footer.tsx         # Guest footer with Mohali details
│   │   │   ├── admin-header.tsx          # Staff admin console header
│   │   │   └── admin-sidebar.tsx         # Operational modules sidebar
│   │   └── shared/                       # Composite shared components
│   │       ├── page-header.tsx           # Standardized section header
│   │       └── stat-card.tsx             # Operational metric card
│   │
│   ├── config/                           # Application configuration & tokens
│   │   ├── site.ts                       # Restaurant metadata, address, contact, hours
│   │   └── theme.ts                      # Design tokens (colors, radii, shadows)
│   │
│   ├── features/                         # Modular feature domains (Roadmap mapping)
│   │   ├── auth/                         # Staff authentication & role guards (Phase 2-3)
│   │   ├── dashboard/                    # Real-time operational dashboard (Phase 3)
│   │   ├── menu/                         # Menu catalog, variants, modifiers (Phase 4)
│   │   ├── tables/                       # Table management & QR tokens (Phase 5)
│   │   ├── orders/                       # Order lifecycle & cart processing (Phase 6)
│   │   ├── kitchen/                      # KDS & BDS live ticket boards (Phase 7)
│   │   ├── analytics/                    # Settlement audit & reporting (Phase 8)
│   │   └── settings/                     # Restaurant operational settings (Phase 3)
│   │
│   ├── hooks/                            # Custom React hooks
│   │   └── use-media-query.ts            # Responsive breakpoint detection
│   │
│   ├── lib/                              # Shared libraries & utilities
│   │   ├── supabase/                     # Dedicated Supabase client modules
│   │   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   │   ├── server.ts                 # Server client (createServerClient with cookies)
│   │   │   ├── middleware.ts             # Session refresh helper
│   │   │   └── admin.ts                  # Server-only service role client
│   │   ├── utils/                        # Utility functions
│   │   │   └── index.ts                  # cn class merger & formatCurrency (INR)
│   │   └── validations/                  # Zod validation schemas
│   │       ├── env.ts                    # Client & server env variable validation
│   │       └── index.ts                  # Validations export
│   │
│   ├── types/                            # TypeScript type definitions
│   │   ├── database.types.ts             # Supabase schema types & enums
│   │   └── index.ts                      # Type exports
│   │
│   └── middleware.ts                     # Next.js root middleware (session handler)
│
├── .env.example                          # Environment variable template
├── .env.local                            # Local development environment (gitignored)
├── .eslintrc.json                        # ESLint configuration
├── .gitignore                            # Git exclusion rules
├── .prettierrc                           # Prettier formatting rules
├── next.config.mjs                       # Next.js build configuration
├── package.json                          # Package dependencies & scripts
├── postcss.config.mjs                    # PostCSS configuration
├── tailwind.config.ts                    # Tailwind CSS configuration & brand tokens
└── tsconfig.json                         # TypeScript compiler configuration
```

---

## 2. Architectural Explanations

1. **Route Groups `(public)` and `(admin)`:**
   - Separates public guest-facing pages from administrative staff pages.
   - Prevents layout collisions while allowing custom headers, footers, and sidebars.
2. **Feature-Driven Architecture (`src/features/`):**
   - Each business capability has a distinct home.
   - In Phase 1, placeholder exports define each feature's architectural boundaries and roadmap milestones without prematurely implementing business logic.
3. **Dedicated Supabase Clients (`src/lib/supabase/`):**
   - `client.ts`: Exposes a singleton browser client using `createBrowserClient` with public anon credentials.
   - `server.ts`: Exposes a server client using `createServerClient` that reads and sets cookies using Next.js `cookies()`.
   - `admin.ts`: Strictly server-only client using `SUPABASE_SERVICE_ROLE_KEY`. Enforces a runtime security barrier that throws if invoked in browser contexts.
   - `middleware.ts`: Implements cookie token synchronization and user session refreshing on matched routes.
