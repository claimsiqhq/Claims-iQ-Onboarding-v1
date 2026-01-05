# Claims IQ Onboarding Application - Codebase Audit

**Date:** January 5, 2026
**Project:** Claims IQ Onboarding v1
**Repository Branch:** `claude/analyze-claims-iq-DiiIX`

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Database Schema](#database-schema)
3. [Package Dependencies](#package-dependencies)
4. [Source Code Structure](#source-code-structure)
5. [Routes & Pages](#routes--pages)
6. [Components](#components)
7. [API Endpoints](#api-endpoints)
8. [What's Functional vs Stubbed](#whats-functional-vs-stubbed)
9. [SQL Syntax Analysis](#sql-syntax-analysis)
10. [Missing Features for Complete Onboarding Flow](#missing-features-for-complete-onboarding-flow)
11. [Recommendations](#recommendations)

---

## Executive Summary

This is a **full-stack claims onboarding application** built with:
- **Frontend:** React 19 + Vite + Tailwind CSS + Radix UI + Wouter (routing)
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (Magic Link + Password)
- **Email:** SendGrid
- **ORM:** Drizzle ORM (minimal usage - primarily using Supabase client)

The application enables insurance companies to onboard with Claims IQ's platform through a multi-step wizard, managing discovery, SOW generation, and project tracking.

---

## Database Schema

### SQL Files Found
```
./supabase/migrations/002_invite_system.sql
```

### Tables Defined in SQL Migration (002_invite_system.sql)

| Table | Purpose | Status |
|-------|---------|--------|
| `invites` | Store invite tokens for onboarding access | ✅ Complete |
| `password_reset_tokens` | Store password reset tokens | ✅ Complete |
| `email_logs` | Audit trail for all sent emails | ✅ Complete |
| `portal_users` (ALTER) | Extended with password auth fields | ✅ Complete |

### Tables Referenced (Must Exist from Migration 001)

Based on foreign key references and code usage, these tables exist in the database:

| Table | Purpose | Fields (Inferred from TypeScript types) |
|-------|---------|----------------------------------------|
| `users` | Claims IQ internal staff | id, auth_user_id, email, first_name, last_name, role, is_active |
| `portal_users` | Client portal users | id, auth_user_id, company_id, contact_id, password_hash, auth_method |
| `companies` | Client company records | id, legal_name, dba_name, website, address_*, city, state, postal_code, company_size, lines_of_business |
| `contacts` | Company contacts | id, company_id, first_name, last_name, email, phone, title, role, is_active |
| `onboarding_projects` | Main project tracking | id, company_id, status, target_go_live_date, actual_go_live_date, assigned_csm_id, notes |
| `module_selections` | Selected modules per project | id, project_id, module_type (core/comms/fnol), is_selected |
| `core_module_configs` | Core module configuration | id, module_selection_id, claim_types[], perils[], document_types[], monthly_claim_volume, etc. |
| `comms_module_configs` | Communications config | id, module_selection_id, desired_channels[], monthly_message_volume, white_label_level, languages_required[] |
| `fnol_module_configs` | FNOL module config | id, module_selection_id, desired_intake_methods[], monthly_fnol_volume, lines_of_business[], photo_required, video_required |
| `integration_configs` | External system integrations | id, project_id, system_name, system_type, connection_method, api_documentation_url |
| `security_compliance_configs` | Security settings | id, project_id, sso_required, sso_provider, data_retention_days, geographic_restrictions[], compliance_requirements[] |
| `checklist_templates` | Onboarding task templates | id, name, description, category, order_index, required_for_modules[] |
| `checklist_items` | Project-specific checklist | id, project_id, template_id, status, assigned_to_id, completed_at, notes |
| `documents` | Uploaded documents | id, project_id, name, file_path, file_type, file_size, status, uploaded_by_id |
| `activity_logs` | Activity audit trail | id, project_id, user_id, action, details, created_at |

### Drizzle Schema (shared/schema.ts)
```typescript
// Minimal - only defines a basic users table (likely for development)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
```
**Note:** Drizzle is used minimally; the application primarily uses the Supabase client directly.

---

## Package Dependencies

### Production Dependencies (Key Packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.2.0 | UI Framework |
| `express` | 4.21.2 | Backend server |
| `@supabase/supabase-js` | 2.89.0 | Database client |
| `@supabase/ssr` | 0.8.0 | SSR auth helpers |
| `@tanstack/react-query` | 5.60.5 | Data fetching |
| `drizzle-orm` | 0.39.3 | ORM (minimal usage) |
| `zod` | 3.25.76 | Schema validation |
| `@sendgrid/mail` | 8.1.6 | Email service |
| `bcrypt` | 6.0.0 | Password hashing |
| `wouter` | 3.3.5 | Client-side routing |
| `framer-motion` | 12.23.24 | Animations |
| `@radix-ui/*` | Various | UI primitives |
| `tailwindcss` | 4.1.14 | CSS framework |

### Dev Dependencies (Key Packages)
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.6.3 | Type checking |
| `vite` | 7.1.9 | Build tool |
| `tsx` | 4.20.5 | TypeScript execution |
| `drizzle-kit` | 0.31.4 | DB migrations |

---

## Source Code Structure

```
Claims-iQ-Onboarding-v1/
├── client/
│   └── src/
│       ├── App.tsx                 # Main app with routing
│       ├── main.tsx                # Entry point
│       ├── components/
│       │   └── ui/                 # 50+ Radix-based UI components
│       ├── pages/
│       │   ├── home.tsx            # Landing page
│       │   ├── login.tsx           # Auth login page
│       │   ├── onboarding.tsx      # Multi-step wizard
│       │   ├── portal.tsx          # Client portal (5 sub-pages)
│       │   ├── admin.tsx           # Admin dashboard
│       │   ├── forgot-password.tsx # Password reset request
│       │   ├── reset-password.tsx  # Password reset form
│       │   └── not-found.tsx       # 404 page
│       ├── hooks/
│       │   ├── useAuth.ts          # Auth state management
│       │   ├── use-toast.ts        # Toast notifications
│       │   └── use-mobile.tsx      # Mobile detection
│       └── lib/
│           ├── supabase.ts         # Client Supabase config
│           ├── utils.ts            # Utility functions
│           └── queryClient.ts      # React Query config
├── server/
│   ├── index.ts                    # Server entry
│   ├── routes.ts                   # Route registration
│   ├── routes/
│   │   ├── auth.ts                 # Authentication routes
│   │   ├── onboarding.ts           # Onboarding submission
│   │   ├── portal.ts               # Portal API routes
│   │   ├── admin.ts                # Admin API routes
│   │   └── invite.ts               # Invite management
│   ├── lib/
│   │   ├── supabase.ts             # Server Supabase client
│   │   ├── email.ts                # SendGrid integration
│   │   ├── invite.ts               # Invite token logic
│   │   ├── password.ts             # Password utilities
│   │   └── tenant.ts               # Multi-tenant helpers
│   ├── middleware/
│   │   └── auth.ts                 # Auth middleware
│   └── services/
│       └── statusNotification.ts   # Status change emails
├── shared/
│   ├── schema.ts                   # Drizzle schema (minimal)
│   ├── types.ts                    # TypeScript interfaces
│   └── validation.ts               # Zod schemas
├── supabase/
│   └── migrations/
│       └── 002_invite_system.sql   # Invite/password migration
└── package.json
```

---

## Routes & Pages

### Frontend Routes (App.tsx)

| Path | Component | Description | Status |
|------|-----------|-------------|--------|
| `/` | `Home` | Landing/marketing page | ✅ Functional |
| `/login` | `LoginPage` | Magic link + password auth | ✅ Functional |
| `/forgot-password` | `ForgotPasswordPage` | Request password reset | ✅ Functional |
| `/reset-password/:token` | `ResetPasswordPage` | Reset password form | ✅ Functional |
| `/onboarding/:token` | `Onboarding` | Multi-step wizard (invite required) | ✅ Functional |
| `/onboarding` | `Onboarding` | Shows access denied without token | ✅ Functional |
| `/portal` | `Portal` → `PortalDashboard` | Client dashboard | ✅ Functional |
| `/portal/sow` | `Portal` → `SOWPage` | Statement of Work viewer | ⚠️ Mock SOW content |
| `/portal/integration` | `Portal` → `IntegrationPage` | API credentials/webhooks | ⚠️ Demo data only |
| `/portal/team` | `Portal` → `TeamPage` | Team management | ⚠️ Read-only |
| `/portal/settings` | `Portal` → `SettingsPage` | User settings | ⚠️ Partially stubbed |
| `/admin` | `AdminDashboard` | Staff admin panel | ✅ Functional |
| `*` | `NotFound` | 404 page | ✅ Functional |

---

## Components

### UI Components (client/src/components/ui/)
57 Radix-based reusable components including:
- Form controls: Button, Input, Select, Checkbox, Switch, Radio, etc.
- Layout: Card, Separator, Tabs, Accordion, Collapsible
- Feedback: Alert, Toast, Skeleton, Progress, Spinner
- Overlays: Dialog, Sheet, Popover, Dropdown, Tooltip
- Data: Table, Badge, Avatar, Calendar

### Key Page Components

**Onboarding Wizard Steps:**
1. `Step1Company` - Company information form
2. `Step2Contact` - Primary contact details
3. `Step3Modules` - Module selection (Core/Comms/FNOL)
4. `Step4Requirements` - Module-specific configuration
5. `Step5Review` - Summary and submission

---

## API Endpoints

### Authentication (`/api/auth/*`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/login` | Send magic link | ✅ |
| POST | `/verify` | Verify OTP | ✅ |
| POST | `/refresh` | Refresh token | ✅ |
| POST | `/signout` | Sign out | ✅ |
| GET | `/me` | Get current user | ✅ |
| GET | `/callback` | Magic link callback | ✅ |
| POST | `/login-password` | Password login | ✅ |
| POST | `/set-password` | Set new password | ✅ |
| POST | `/forgot-password` | Request reset | ✅ |
| GET | `/validate-reset-token/:token` | Validate token | ✅ |
| POST | `/reset-password` | Reset password | ✅ |
| POST | `/password-strength` | Check strength | ✅ |

### Onboarding (`/api/onboarding/*`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/validate-invite/:token` | Validate invite | ✅ |
| POST | `/submit` | Submit onboarding form | ✅ |
| GET | `/status/:projectId` | Get project status | ✅ |

### Portal (`/api/portal/*`) - Requires Auth
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/projects` | List user's projects | ✅ |
| GET | `/projects/:projectId` | Get project details | ✅ |
| GET | `/projects/:projectId/checklist` | Get checklist | ✅ |
| PATCH | `/checklist/:itemId` | Update checklist item | ✅ |
| GET | `/projects/:projectId/documents` | Get documents | ✅ |
| GET | `/projects/:projectId/activity` | Get activity log | ✅ |

### Admin (`/api/admin/*`) - Requires Staff Role
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/projects` | List all projects | ✅ |
| GET | `/projects/:projectId` | Get project (admin) | ✅ |
| PATCH | `/projects/:projectId` | Update project | ✅ |
| GET | `/stats` | Dashboard statistics | ✅ |
| GET | `/companies` | List all companies | ✅ |
| POST | `/portal-users` | Create portal user | ⚠️ Partial |

### Invites (`/api/invites/*`)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/validate/:token` | Validate token (public) | ✅ |
| POST | `/` | Create invite (staff) | ✅ |
| GET | `/` | List invites (staff) | ✅ |
| GET | `/:id` | Get invite (staff) | ✅ |
| POST | `/:id/resend` | Resend invite | ✅ |
| POST | `/:id/revoke` | Revoke invite | ✅ |
| GET | `/stats/summary` | Invite statistics | ✅ |

---

## What's Functional vs Stubbed

### ✅ Fully Functional
1. **Authentication System**
   - Magic link login via Supabase Auth
   - Password authentication with bcrypt hashing
   - Password reset flow with email tokens
   - JWT cookie-based session management
   - Role-based access (Staff vs Portal User)

2. **Onboarding Wizard**
   - 5-step form with validation
   - Invite token validation
   - Company, contact, module selection
   - Module-specific requirements configuration
   - Form submission creates full database records

3. **Email System**
   - SendGrid integration with HTML templates
   - Invite emails, welcome emails, status updates
   - Password reset emails
   - Email logging for audit

4. **Portal Dashboard**
   - Project listing with company info
   - Checklist display and status updates
   - Activity log viewing
   - Progress tracking

5. **Admin Dashboard**
   - Project overview with metrics
   - Status filtering and search
   - Project status updates with notifications

6. **Invite Management**
   - Create, list, revoke, resend invites
   - Expiration handling

### ⚠️ Partially Functional / Stubbed

1. **SOW (Statement of Work) Page**
   - Mock SOW document displayed
   - "Approve & Sign" button → shows toast only
   - "Download PDF" → downloads text file placeholder
   - "Request Changes" → UI only, no backend

2. **Integration Page**
   - Demo API credentials (fake)
   - Webhook URL input → UI only
   - Event subscription toggles → not persisted
   - Connected systems → read-only from DB

3. **Team Management Page**
   - Displays contacts from DB
   - "Invite Team Member" button → no action
   - Role badges → display only

4. **Settings Page**
   - Profile info → forms don't save
   - Notification preferences → not persisted
   - Password change → UI only (would need backend)
   - 2FA → UI only
   - Sessions → shows current only

5. **Admin Portal User Creation**
   - Returns instructions but doesn't actually create user
   - Requires manual Supabase Auth setup

### ❌ Not Implemented
1. **Document Upload** - file storage infrastructure missing
2. **Real PDF Generation** - SOW as actual PDF
3. **E-Signature Integration** - no DocuSign/similar
4. **Webhook Delivery** - infrastructure not built
5. **SSO Configuration** - UI exists, backend missing
6. **Two-Factor Authentication** - UI only
7. **File Storage** - no Supabase Storage setup

---

## SQL Syntax Analysis

### Migration 002 (`002_invite_system.sql`)

**✅ No Syntax Errors Found**

The SQL is valid PostgreSQL syntax with:
- Proper `CREATE TABLE IF NOT EXISTS` usage
- Correct constraint definitions with `CHECK` clauses
- Proper index creation with `IF NOT EXISTS`
- Well-structured trigger function using `plpgsql`
- Correct RLS policy definitions

**Observations:**
1. Uses `gen_random_uuid()` for UUID generation (PostgreSQL 13+)
2. All foreign keys properly defined with `REFERENCES`
3. Idempotent with `IF NOT EXISTS` and `DROP TRIGGER IF EXISTS`
4. RLS policies properly configured for staff access

**Potential Issue:**
```sql
-- Line 12: FK references users(id) but users.id is VARCHAR in Drizzle schema
invited_by_id UUID REFERENCES users(id),
```
The Drizzle `users` table has `id` as `VARCHAR`, but the migration expects `UUID`. This could cause type mismatch errors. **However**, the Drizzle schema appears to be a stub and the real `users` table in Supabase likely uses UUID.

---

## Missing Features for Complete Onboarding Flow

### Critical (Blocking Production)

1. **First Migration (001) is Missing**
   - Need the base schema migration that creates:
     - companies, contacts, onboarding_projects
     - module_selections, all module configs
     - checklist_templates, checklist_items
     - documents, activity_logs
     - users, portal_users

2. **Document Upload Storage**
   - No Supabase Storage bucket configured
   - Upload API endpoints not implemented
   - Document viewer not functional

3. **Checklist Template Seeding**
   - No default checklist templates in DB
   - Need seed script for onboarding tasks

### High Priority

4. **SOW Document Generation**
   - Need actual PDF generation (pdfkit/puppeteer)
   - Template system for SOW content

5. **E-Signature Capability**
   - DocuSign or similar integration
   - Signed document storage

6. **Webhook System**
   - Event queue infrastructure
   - Retry logic and delivery tracking

7. **Admin "New Client" Flow**
   - Button links to /onboarding but should create invite
   - Need invite creation modal in admin

### Medium Priority

8. **Portal User Auto-Creation**
   - After onboarding submission, auto-create portal user
   - Currently requires manual steps

9. **Settings Persistence**
   - Notification preferences table
   - User profile update API

10. **Password Change (from Settings)**
    - API endpoint exists but UI not connected

11. **Team Member Invitations**
    - Send portal access invites to additional contacts

---

## Recommendations

### Immediate Actions

1. **Create Migration 001**
   ```bash
   # Generate from Supabase dashboard schema or create manually
   supabase db dump --schema public > supabase/migrations/001_initial_schema.sql
   ```

2. **Seed Checklist Templates**
   ```sql
   INSERT INTO checklist_templates (name, category, order_index, required_for_modules) VALUES
   ('Sign Contract', 'Legal', 1, ARRAY['core', 'comms', 'fnol']),
   ('Provide API Credentials', 'Technical', 2, ARRAY['core']),
   -- etc.
   ```

3. **Configure Supabase Storage**
   - Create `documents` bucket
   - Set up RLS policies for document access

### Architecture Improvements

1. **Use Drizzle Consistently** - Currently mixed Supabase client / Drizzle
2. **Add Error Boundaries** - Improve React error handling
3. **Add API Rate Limiting** - Protect auth endpoints
4. **Implement Proper Logging** - Structured logging with request IDs
5. **Add Health Check Dashboard** - Monitor email/DB/auth status

### Testing Needs

- Unit tests for validation schemas
- Integration tests for auth flow
- E2E tests for onboarding wizard
- API endpoint tests

---

## Environment Variables Required

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...  # Service role key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Application
APP_URL=https://your-app-url.com

# SendGrid
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@claimsiq.com
SENDGRID_FROM_NAME=Claims iQ

# Configuration
INVITE_EXPIRATION_DAYS=7
INVITE_TOKEN_LENGTH=32
PASSWORD_RESET_EXPIRATION_HOURS=24
```

---

## Summary

The Claims IQ Onboarding application is approximately **70-80% complete** for a functional MVP. The core onboarding flow, authentication, and admin dashboard are fully functional. The main gaps are:

1. Missing initial database migration (001)
2. Document upload/storage infrastructure
3. Real PDF/SOW generation
4. E-signature integration
5. Some UI-only features in settings

The codebase is well-structured with clear separation between client/server/shared code. TypeScript types are comprehensive, and the Zod validation schemas provide good data integrity. The SQL migration syntax is correct with no errors found.
