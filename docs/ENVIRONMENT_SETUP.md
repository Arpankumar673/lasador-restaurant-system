# L'Asador – Grill & Brew | Environment Setup Guide
**Location:** Sector 82, JLPL Industrial Area, Mohali, Punjab, India  
**Scope:** Single-Restaurant Dedicated Infrastructure  
**Document Version:** 1.0.0 (Phase 1 Foundation)  

---

## 1. Prerequisites

Before setting up the project, ensure the following tools are installed:

- **Node.js:** v18.18.0 or newer (v20.x LTS or v24.x recommended)
- **npm:** v9.x or newer (included with Node.js)
- **Git:** Standard git version control

---

## 2. Dedicated Supabase Project Setup

> [!IMPORTANT]
> Do NOT connect to or reuse any TableTap Supabase instance. Create a brand-new Supabase project dedicated solely to L'Asador.

1. Navigate to [Supabase Management Console](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set the project details:
   - **Name:** `lasador-grill-brew`
   - **Database Password:** Store securely in your credentials manager.
   - **Region:** `ap-south-1` (Mumbai, India) for optimal latency to Mohali, Punjab.
4. Once provisioned, navigate to **Project Settings -> API** to retrieve your project keys:
   - **Project URL:** `https://<your-project-ref>.supabase.co`
   - **anon (public) key:** Copy the string.
   - **service_role (secret) key:** Copy the string (treat with extreme confidentiality).

---

## 3. Local Environment Configuration

1. Copy `.env.example` to create your local `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the required environment variables:

   ```ini
   # Dedicated Supabase Project URL
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co

   # Dedicated Supabase Public Anon Key (Browser-safe)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Dedicated Supabase Service Role Key (Server-Only, Confidentially Maintained)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # Application URL (Default for local development)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Ensure `.env.local` is listed in `.gitignore` (pre-configured) to prevent accidental commits.

---

## 4. Dependency Installation & Verification

Run the following commands in the workspace root:

```bash
# 1. Install dependencies
npm install

# 2. Verify TypeScript compilation
npm run type-check

# 3. Verify ESLint compliance
npm run lint

# 4. Start local development server
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 5. Security & Verification Checklist

- [x] No `tenant_id` references anywhere in the project.
- [x] No TableTap credentials, project IDs, or repository URLs in codebase or config.
- [x] `.env.local` is excluded from git tracking.
- [x] Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`) are isolated from browser execution.
- [x] Environment validation with Zod guards against missing credentials at runtime.
