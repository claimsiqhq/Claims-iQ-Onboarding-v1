# Claims IQ Onboarding Portal — Figma Design Prompt

## Project Overview

Design a modern, professional client onboarding portal for **Claims IQ**, an AI-powered insurance claims processing platform. The portal enables insurance carriers to self-register, complete discovery forms, configure their module selections, and receive a generated Statement of Work.

**Target Users:**
- Claims operations executives at insurance carriers
- IT/technical leads evaluating the platform
- Procurement teams reviewing SoW documents

**Brand Personality:**
- Trustworthy & enterprise-ready (insurance industry)
- Modern & innovative (AI-powered)
- Clean & efficient (reduces complexity)
- Professional but approachable

---

## Design System Foundations

### Color Palette

**Primary Colors:**
- Navy: `#0A1628` — Headers, primary text, footer
- Blue: `#2563EB` — Primary actions, links, progress indicators
- Sky: `#38BDF8` — Accents, highlights, hover states

**Neutral Colors:**
- Slate 900: `#0F172A` — Dark text
- Slate 600: `#475569` — Secondary text
- Slate 400: `#94A3B8` — Muted text, placeholders
- Slate 100: `#F1F5F9` — Backgrounds, cards
- White: `#FFFFFF` — Card backgrounds, inputs

**Semantic Colors:**
- Success: `#10B981` (Emerald 500) — Completed states, confirmations
- Warning: `#F59E0B` (Amber 500) — Attention, pending items
- Danger: `#EF4444` (Red 500) — Errors, destructive actions
- Info: `#3B82F6` (Blue 500) — Informational callouts

### Typography

**Font Family:** Inter (Google Fonts) — Clean, professional, excellent readability

**Type Scale:**
- Display: 48px / 56px line-height / -0.02em tracking — Hero headlines
- H1: 36px / 44px / -0.02em — Page titles
- H2: 24px / 32px / -0.01em — Section headers
- H3: 20px / 28px — Card titles, form sections
- H4: 16px / 24px / Medium weight — Subsection headers
- Body: 16px / 24px — Default text
- Body Small: 14px / 20px — Secondary text, descriptions
- Caption: 12px / 16px — Labels, metadata, badges

**Font Weights:**
- Regular (400): Body text
- Medium (500): Labels, buttons, navigation
- Semibold (600): Subheadings, emphasis
- Bold (700): Headlines, key metrics

### Spacing System

Use 4px base unit:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Border Radius

- Small: 4px — Badges, small elements
- Medium: 8px — Buttons, inputs, cards
- Large: 12px — Modal, larger cards
- XL: 16px — Hero sections, feature cards

### Shadows

- sm: `0 1px 2px rgba(0,0,0,0.05)` — Subtle elevation
- md: `0 4px 6px rgba(0,0,0,0.07)` — Cards, dropdowns
- lg: `0 10px 15px rgba(0,0,0,0.1)` — Modals, popovers
- Primary glow: `0 4px 14px rgba(37,99,235,0.25)` — Primary button hover

---

## Page Designs Required

### 1. Landing Page (`/`)

**Purpose:** Convert visitors to start onboarding

**Layout:**
- Sticky header with logo, "Sign In" link, "Get Started" primary CTA
- Hero section with headline, subheadline, dual CTAs
- "How It Works" — 4-step horizontal process with icons
- Module features section — 3 cards for Core, Comms, FNOL
- Social proof / trust indicators (SOC2 badge, carrier logos placeholder)
- Final CTA section
- Footer with links

**Hero Content:**
```
Headline: "Welcome to the Claims IQ Onboarding Portal"
Subheadline: "Complete your organization's setup in minutes. Our guided process collects everything we need to configure your AI-powered claims platform."
Primary CTA: "Start Onboarding" (arrow icon)
Secondary CTA: "Continue Existing Setup"
```

**Visual Notes:**
- Subtle gradient background (slate-50 to white)
- Geometric abstract shapes or subtle grid pattern in hero
- Module cards should feel distinct but cohesive (use color-coded icons/badges)

---

### 2. Multi-Step Onboarding Form (`/onboarding/start`)

**Purpose:** Collect all discovery information in a guided flow

**Structure:**
- Fixed header with logo and step progress indicator
- Progress bar showing 5 steps: Company → Contact → Modules → Requirements → Review
- Main content area (max-width ~720px, centered)
- Navigation buttons at bottom: Back / Continue

**Step Progress Indicator Design:**
- Horizontal stepper with numbered circles
- Completed steps: Emerald background with checkmark
- Current step: Blue background, pulsing subtle animation
- Future steps: Slate-100 background, muted text
- Connecting lines between steps (colored when complete)

#### Step 1: Company Information

**Form Fields:**
- Legal Company Name* (text input)
- DBA / Trade Name (text input)
- Website (URL input)
- Street Address* (text input)
- Address Line 2 (text input)
- City*, State*, ZIP* (3-column grid)
- Company Size (select dropdown)
- Annual Claims Volume (number input with helper text)
- Lines of Business* (checkbox grid, 2 columns)
  - Personal Auto, Commercial Auto, Homeowners, Renters, Commercial Property, Workers Comp, General Liability, Professional Liability

**Visual Notes:**
- Group related fields with subtle section dividers
- Required field indicator (asterisk) in label
- Helpful placeholder text in inputs
- Validation errors appear below field in red

#### Step 2: Primary Contact

**Form Fields:**
- First Name*, Last Name* (2-column)
- Email Address* (email input)
- Phone Number (tel input with formatting)
- Job Title (text input)
- Role (select: Primary, Technical, Billing, Executive)

**Visual Notes:**
- Avatar placeholder circle at top (optional)
- Note about adding additional contacts later

#### Step 3: Module Selection

**Layout:** 3 large selectable cards, stacked vertically

**Card Structure (for each module):**
```
┌─────────────────────────────────────────────────────────────┐
│  [Color Badge]  Module Name                    [Checkbox]   │
│  CORE           Claims Intelligence Engine     ☑ Selected   │
│                                                             │
│  AI-powered document processing, extraction,                │
│  and validation for insurance claims.                       │
│                                                             │
│  [Tag] Document classification  [Tag] Data extraction       │
│  [Tag] Fraud detection         [Tag] Coverage verification  │
└─────────────────────────────────────────────────────────────┘
```

**Module Colors:**
- Core: Blue (`#2563EB`)
- Comms: Emerald (`#10B981`)
- FNOL: Purple (`#8B5CF6`)

**States:**
- Default: Light border, white background
- Hover: Border darkens, subtle shadow
- Selected: Blue border (2px), light blue background tint, checkmark visible

#### Step 4: Requirements (Dynamic based on selections)

**Sub-sections appear based on modules selected in Step 3**

**If Core selected:**
- Claim Types (checkbox grid)
- Perils Covered (checkbox grid)
- Document Types (checkbox grid)
- Monthly Claim Volume (number)
- Monthly Document Volume (number)
- Current Pain Points (textarea)

**If Comms selected:**
- Current Communication Channels (checkbox)
- Desired Channels (checkbox)
- White Label Level (radio: None, Basic, Full)
- Languages Required (checkbox)
- Response SLA (number input + "hours" suffix)

**If FNOL selected:**
- Current Intake Methods (checkbox)
- Desired Intake Methods (checkbox)
- Photo Required (toggle switch)
- Video Required (toggle switch)
- Voice Intake (toggle switch)

**Visual Notes:**
- Collapsible sections for each module (accordion style)
- Section headers show module badge/color
- Toggle switches for boolean options
- Inline help text for complex fields

#### Step 5: Review & Submit

**Layout:**
- Summary cards for each section (Company, Contact, Modules)
- Each card shows key data with "Edit" link to jump back
- Expandable sections for detailed view
- Confirmation checkbox: "I confirm this information is accurate"
- Submit button: "Generate Statement of Work"

**Visual Notes:**
- Use a slightly different card style (outlined, not filled)
- Show selected modules as colored pills
- Clear visual hierarchy—most important info prominent

---

### 3. Client Portal Dashboard (`/portal`)

**Purpose:** Post-registration hub for clients to track onboarding progress

**Layout:**
- Sidebar navigation (collapsible on mobile)
- Main content area with welcome header
- Progress overview card
- Checklist section
- Recent activity feed
- Quick actions

**Sidebar Navigation:**
- Logo at top
- Nav items: Dashboard, Discovery, Documents, Integrations, Team, Settings
- User avatar + name at bottom with dropdown

**Progress Overview Card:**
```
┌─────────────────────────────────────────────────────────────┐
│  Onboarding Progress                                        │
│  ═══════════════════════════════════════════░░░░░░  65%    │
│                                                             │
│  Stage: Technical Onboarding                                │
│  Target Go-Live: March 15, 2026                            │
│                                                             │
│  [View Checklist]                      [Contact Your CSM]   │
└─────────────────────────────────────────────────────────────┘
```

**Checklist Preview:**
- Show next 5 pending items
- Checkbox, item name, owner badge (Client/Claims IQ), due date
- Completed items struck through with green checkmark

---

### 4. Admin Dashboard (`/admin`)

**Purpose:** Claims IQ internal team view of all clients

**Layout:**
- Sidebar with: Dashboard, Clients, Projects, Team, Settings
- Main area with metrics cards at top
- Filterable/searchable table of onboarding projects

**Metrics Cards (4 across):**
- Active Projects (number)
- Discovery Phase (number)
- Pending SoW (number)
- Go-Live This Month (number)

**Projects Table Columns:**
- Company Name
- Project Name
- Status (badge)
- Stage (badge)
- Modules (pill list)
- Target Go-Live
- CSM Assigned
- Actions (view, edit)

**Status Badges:**
- Draft: Gray
- Discovery: Blue
- SoW Pending: Amber
- Contract Signed: Purple
- Onboarding: Cyan
- Live: Green
- Paused: Orange
- Cancelled: Red

---

### 5. SoW Preview / Generation (`/portal/sow`)

**Purpose:** Display generated Statement of Work for review

**Layout:**
- Document preview area (looks like a paper document)
- Sidebar with: Download PDF, Request Changes, Approve & Sign
- Version history dropdown
- Comments/annotation capability (optional)

**Document Styling:**
- White background with subtle shadow (paper effect)
- Professional document typography
- Section headers clearly delineated
- Tables for pricing, timeline, responsibilities
- Page break indicators

---

## Component Library

### Buttons

**Primary Button:**
- Background: Blue 600
- Text: White, Medium weight
- Padding: 12px 24px
- Border radius: 8px
- Hover: Blue 700, shadow glow
- Active: Blue 800
- Disabled: Slate 300 background, Slate 500 text

**Secondary Button:**
- Background: White
- Border: 1px Slate 200
- Text: Slate 700
- Hover: Slate 50 background

**Ghost Button:**
- Background: Transparent
- Text: Blue 600
- Hover: Blue 50 background

**Destructive Button:**
- Background: Red 600
- Text: White

### Form Inputs

**Text Input:**
- Height: 44px
- Border: 1px Slate 200
- Border radius: 8px
- Focus: Blue 500 border, Blue 100 ring (3px)
- Error: Red 500 border, Red 100 ring
- Placeholder: Slate 400

**Select Dropdown:**
- Same styling as text input
- Chevron icon right-aligned
- Dropdown panel with hover states

**Checkbox:**
- 18x18px square
- Border radius: 4px
- Checked: Blue 600 fill, white checkmark
- Focus ring on keyboard navigation

**Toggle Switch:**
- Track: 44x24px, Slate 200 (off) / Blue 600 (on)
- Thumb: 20x20px white circle with shadow
- Smooth transition animation

**Textarea:**
- Min height: 120px
- Resize: vertical only
- Same border/focus styling as text input

### Cards

**Default Card:**
- Background: White
- Border: 1px Slate 200
- Border radius: 12px
- Padding: 24px
- Shadow: sm

**Interactive Card (selectable):**
- Default + hover shadow elevation
- Selected state: Blue border, Blue 50 background

**Stat Card:**
- Metric number large (32px, bold)
- Label below (14px, muted)
- Optional trend indicator (up/down arrow with color)

### Badges / Pills

**Status Badge:**
- Padding: 4px 10px
- Border radius: 9999px (pill)
- Font: 12px, Medium weight
- Colors vary by status (see above)

**Module Pill:**
- Same shape as badge
- Color matches module (Core=Blue, Comms=Green, FNOL=Purple)
- Can include small icon

### Navigation

**Sidebar Nav Item:**
- Height: 44px
- Padding: 0 16px
- Icon (20x20) + Label
- Active: Blue 50 background, Blue 600 text
- Hover: Slate 50 background

**Breadcrumbs:**
- Slash separator
- Current page: Slate 900
- Parent pages: Slate 500, underline on hover

### Progress Indicators

**Progress Bar:**
- Track: 8px height, Slate 100, full rounded
- Fill: Blue 600, animated gradient shimmer (optional)
- Percentage label right-aligned

**Step Indicator:**
- Circles: 40x40px
- Connector lines: 2px height
- States: completed (green), active (blue pulse), pending (gray)

### Tables

**Header Row:**
- Background: Slate 50
- Text: Slate 600, 12px, uppercase, medium weight
- Padding: 12px 16px

**Body Row:**
- Background: White
- Border bottom: 1px Slate 100
- Hover: Slate 50 background
- Padding: 16px

### Modals

**Modal Container:**
- Max width: 480px (small), 640px (medium), 800px (large)
- Background: White
- Border radius: 16px
- Shadow: lg
- Backdrop: Black 50% opacity

**Modal Header:**
- Title: H3 style
- Close button (X) top right
- Optional icon left of title

---

## Interaction & Animation Notes

**Page Transitions:**
- Fade in content (200ms ease-out)
- Slide in from right for multi-step form progression

**Button Interactions:**
- Hover: 150ms color transition
- Click: Scale down to 0.98 (50ms), then back

**Form Validation:**
- Shake animation on error (subtle, 300ms)
- Error message fades in below field

**Progress Updates:**
- Progress bar fills with easing animation
- Step circles transition color smoothly

**Card Selection:**
- Border color transitions (200ms)
- Checkmark fades/scales in

**Loading States:**
- Skeleton loaders for content areas
- Spinner for button loading states
- Pulse animation for "processing" states

---

## Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Single column layouts
- Hamburger menu for navigation
- Full-width cards and inputs
- Bottom sheet for modals
- Simplified step indicator (current step only)

---

## Figma File Structure

```
📁 Claims IQ Onboarding Portal
├── 📄 Cover
├── 📁 Design System
│   ├── Colors
│   ├── Typography
│   ├── Spacing & Grid
│   ├── Icons
│   └── Components
│       ├── Buttons
│       ├── Inputs
│       ├── Cards
│       ├── Navigation
│       ├── Badges
│       ├── Tables
│       └── Modals
├── 📁 Pages
│   ├── Landing Page
│   ├── Onboarding Flow
│   │   ├── Step 1 - Company
│   │   ├── Step 2 - Contact
│   │   ├── Step 3 - Modules
│   │   ├── Step 4 - Requirements
│   │   └── Step 5 - Review
│   ├── Client Portal
│   │   ├── Dashboard
│   │   ├── Checklist
│   │   ├── Documents
│   │   └── SoW Preview
│   └── Admin Dashboard
│       ├── Overview
│       ├── Project List
│       └── Project Detail
├── 📁 Mobile Designs
│   └── (Responsive versions)
└── 📁 Prototypes
    ├── Onboarding Flow
    └── Portal Navigation
```

---

## Deliverables Checklist

- [ ] Design system with all tokens documented
- [ ] Component library with all states
- [ ] Landing page (desktop + mobile)
- [ ] 5-step onboarding form (desktop + mobile)
- [ ] Client portal dashboard
- [ ] Admin dashboard
- [ ] SoW preview page
- [ ] Interactive prototype for onboarding flow
- [ ] Dev handoff with inspect mode enabled

---

## Reference / Inspiration

**Similar B2B SaaS Portals:**
- Stripe Dashboard (clean, professional)
- Linear (modern, fast-feeling)
- Notion (clear hierarchy, good empty states)
- Vercel (developer-focused but accessible)

**Insurance Industry References:**
- Lemonade (modern insurance, approachable)
- Coalition (cyber insurance, tech-forward)
- Hippo (clean, trustworthy)

---

*End of Design Prompt*
