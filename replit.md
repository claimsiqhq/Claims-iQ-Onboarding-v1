# Claims iQ Onboarding Portal

## Overview

Claims iQ is an AI-powered insurance claims processing platform with a client onboarding portal. The application enables insurance carriers to self-register, complete discovery workflows, and manage their onboarding journey through a guided multi-step process.

**Core Features:**
- Multi-step onboarding wizard for insurance carriers
- Client portal for tracking onboarding progress and checklist items
- Admin dashboard for Claims iQ staff to manage projects
- Invite-based registration system with email notifications
- Magic link and password-based authentication

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables
- **Form Handling**: React Hook Form with Zod validation
- **Animations**: Framer Motion for transitions

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **Build Tool**: esbuild for server bundling, Vite for client
- **API Design**: RESTful endpoints under `/api/*` prefix

### Authentication & Authorization
- **Auth Provider**: Supabase Auth (magic links and password-based)
- **Token Storage**: HTTP-only cookies for access tokens
- **User Types**: Claims iQ staff (admin) and portal users (clients)
- **Middleware**: Custom auth middleware with tenant isolation

### Data Storage
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`npm run db:push`)

### Project Structure
```
client/src/       # React frontend
  pages/          # Route components
  components/ui/  # shadcn/ui components
  hooks/          # Custom React hooks
  lib/            # Utilities and API client
server/           # Express backend
  routes/         # API route handlers
  lib/            # Server utilities (auth, email, etc.)
  middleware/     # Express middleware
shared/           # Shared types and validation schemas
```

## External Dependencies

### Supabase
- **Purpose**: Authentication and PostgreSQL database hosting
- **Configuration**: Requires `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `VITE_SUPABASE_PUBLISHABLE_KEY` environment variables
- **Usage**: Server uses secret key for admin operations; client uses publishable key

### SendGrid
- **Purpose**: Transactional email delivery (invites, magic links, status updates)
- **Package**: `@sendgrid/mail`
- **Configuration**: Requires SendGrid API key in environment

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `bcrypt`: Password hashing
- `zod`: Schema validation (shared between client/server)
- `date-fns`: Date formatting utilities
- `framer-motion`: Animation library