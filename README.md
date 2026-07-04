# Handoff: FormOS — No-Code Form Engine Platform

## Overview
FormOS is an enterprise no-code platform for building unlimited data-collection forms/checklists without writing code, with a metadata-driven architecture spanning a User Engine (companies, plants, departments, teams, roles, permissions) and a Form Engine (30+ field types, validation, conditional logic, compliance template library, responses, and Excel/report export). It also functions as a Progressive Web App so field/plant staff can fill assigned checklists offline-first on mobile.

## About the Design Files
The bundled file (`Form Engine.dc.html`) is a **design reference built in a prototyping tool** (a custom React-like templating runtime), not production code to copy directly. It demonstrates exact layout, color, spacing, typography, states, and interaction behavior. **Do not attempt to run or embed this HTML file as-is in the production app.** Your task is to **recreate this UI/UX in a standard React + Vite + Tailwind codebase**, using the design tokens and component behavior documented below as the source of truth. Treat the HTML file purely as a rendered reference — open it in a browser to see exact colors/spacing/interactions if the written spec below is ever ambiguous.

## Fidelity
**High-fidelity (hifi).** Every screen shown is a finished, pixel-specific mockup — exact colors, spacing, type scale, and interaction states are final. Recreate pixel-perfectly.

## Recommended Tech Stack

Since Next.js was explicitly ruled out, use:

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS (utility classes replacing the prototype's inline styles) + CSS custom properties for the theme system (`--accent`, `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--muted`) so accent-color switching and dark mode work exactly as in the prototype
- **Routing**: React Router v6 (client-side; this is an internal admin tool, no SEO/SSR needed)
- **Icons**: `lucide-react` (same icon set/stroke-width already used in the prototype — 1.75px stroke, 24x24 viewBox)
- **State management**: Zustand (lightweight, matches the prototype's flat `state` object pattern) for UI state (sidebar, theme, active screen); React Query (`@tanstack/react-query`) for all server data (forms, responses, users, etc.)
- **Forms/validation**: `react-hook-form` + `zod` for the actual runtime form-filling experience (the PWA side) and for the Form Builder's field validation config
- **Auth**: See dedicated Authentication section below
- **Database**: PostgreSQL
- **API layer — two supported options**:
  1. **Custom Node/Express (or Fastify) + Prisma ORM** — full control, easiest to add custom business logic (conditional logic engine, formula fields, report generation)
  2. **PostgREST** — auto-generates a REST API directly from the Postgres schema + Row Level Security policies. Recommended if you want to minimize backend code: pair it with **PostgREST + a thin Node "logic service"** only for things Postgres can't do alone (file uploads to S3, PDF/Excel report generation, sending emails). Use Postgres Row Level Security (RLS) policies to enforce the permissions matrix (see Permissions section) directly at the database layer — this is the natural fit for PostgREST since there's no application-layer auth middleware.
- **File storage**: S3-compatible bucket (AWS S3, Cloudflare R2, or Supabase Storage) for Image/Camera/Video/Audio/Signature/File-Upload field types
- **PWA**: Vite PWA plugin (`vite-plugin-pwa`) using the same `manifest.json` already included in this bundle — enables offline-first checklist filling with background sync when connectivity returns

## Authentication Page

### Purpose
Single entry point gating the entire app. Two modes toggled by a text link at the bottom: **Sign In** (default) and **Create Account**.

### Layout
- Full-viewport centered flex container, `align-items:center; justify-content:center`, background = `var(--bg)` (Paper White `#FAFAF8` light / `#111113` dark)
- Content column: `max-width: 400px`, `width: 100%`, `padding: 20px` on the outer wrapper for mobile safety
- **Brand block** (above the card): 44×44px rounded-square logo (`border-radius: 11px`, solid accent-color background, white bold "F" glyph 20px), 14px gap, then "FormOS" (20px / 700 / -0.4px letter-spacing) and "No-Code Form Engine" subtitle (13px, muted gray), 28px margin-bottom before the card
- **Card**: white/`#1C1C1E` surface, `1px solid` border (`#E4E4E7` light / `#303036` dark), `border-radius: 14px`, `padding: 32px 28px`, subtle shadow in light mode only (`0 1px 3px rgba(0,0,0,.05)`), none in dark mode
- Card heading: "Welcome back" (sign in) / "Create your account" (sign up) — 18px/700; subtitle 13px muted, 24px margin-bottom

### Form fields (top-labeled, 16px vertical gap between fields)
- Sign-up only: **Full Name** text input
- **Work Email** — `type="email"`, placeholder `you@company.com`
- **Password** — `type="password"`, placeholder `••••••••`
- Sign-up only: **Confirm Password**
- All inputs: `padding: 11px 13px`, `border-radius: 8px`, `1px solid` border, `font-size: 14px`, label style `12px/600` with `6px` margin-bottom
- Sign-in only: right-aligned "Forgot password?" link (12px, accent color, above the submit button, `18px` margin-bottom)

### Validation rules (client + mirror server-side)
- Both Email and Password required — error: "Please enter both email and password."
- Password minimum 6 characters — error: "Password must be at least 6 characters."
- Errors render as an inline banner directly above the submit button: light red background (`#FEF2F2` / `#3F1D1D` dark), `1px solid #FECACA` (`#7F1D1D` dark) border, `8px` radius, info icon + red text (`#B91C1C` / `#FCA5A5` dark), `12px` font

### Actions
- Primary submit button: full width, solid accent background, white text, `11px` vertical padding, `8px` radius, `600` weight, `14px` — label "Sign In" / "Create Account"
- Divider row below: "OR" centered between two 1px horizontal rules, `20px` vertical margin
- Secondary button: "Continue with SSO" — full width, transparent background, `1px` border, shield icon + text, same radius/padding family as primary
- Footer line below the card (not inside it): centered, 13px muted — "Don't have an account? **Sign up**" / "Already have an account? **Sign in**" — the bold portion is an accent-colored, bold link that toggles `authMode` between `login`/`signup` without a page navigation

### States
- On successful submit (client-side mock in the prototype: any well-formed email + password ≥6 chars) → sets `isAuthed = true` and reveals the full app shell
- A **sign-out** icon button sits in the sidebar's user-profile footer row (next to the settings gear) — clicking it clears the session and returns to this screen
- No "remember me" / persistent session in the prototype — production should issue a JWT or session cookie and persist across reloads

### Production auth recommendation
Don't hand-roll password auth in production. Use one of:
- **Supabase Auth** (if using Supabase for Postgres/Storage) — gives email/password, magic link, and SSO (SAML/OIDC for enterprise customers) out of the box, and issues JWTs that plug directly into PostgREST's `Authorization: Bearer` + RLS role-claim pattern
- **Auth.js (NextAuth successor, framework-agnostic core)** or **Clerk** if not using Supabase
- Enterprise customers will likely want **SSO (SAML/OIDC)** — the "Continue with SSO" button in the design is a placeholder for this; wire it to your IdP integration once chosen
- Store the authenticated user's `role` (Administrator / Form Editor / Compliance Auditor / Viewer) as a JWT custom claim so both the client UI and Postgres RLS policies can key off it without extra queries

## Screens / Views

### 1. Dashboard
- **Purpose**: Landing screen after login; platform-wide overview
- **Layout**: Header (21px/700 title + 13px muted subtitle) → 4-column stat-card grid (`grid-template-columns: repeat(4, 1fr)`, `gap: 16px`, collapses to `repeat(2,1fr)` under 1080px and 2-col even on phones) → "Recent Forms" table card below
- **Stat cards**: white/dark surface, `1px` border, `12px` radius, `20px` padding. Each has a label (12px/500 muted) + small icon-in-tinted-square (top row), a large value (28px/700/-1px letter-spacing), and a change caption (11px muted)
- **Recent Forms table**: card wrapper, header row with title + "View all →" link, then a 7-column table (Name w/ icon, Category, Fields, Responses, Status badge, Updated, Edit action)

### 2. Forms (list)
- Header with title/subtitle, inline search box, primary "New Form" button (accent bg, plus icon)
- Full-width data table: Name (with icon), Category, Fields, Responses, Status, Updated, Actions (Edit button + overflow "more" icon button)

### 3. Form Builder
- **Toolbar** (52px height, bottom border): back arrow → vertical divider → editable form-name text input (inline, transparent bg) → flexible spacer → segmented 3-tab control (**Build / Logic / Preview**, active tab = white/dark surface pill on a tinted track) → divider → "Save as Template" secondary button → "Save Draft" secondary button → "Publish" primary button (send icon)
- **Build mode = 3-panel layout**:
  - **Left (232px, scrollable)**: "Field Library" search box, then 9 labeled categories (Text & Content, Numbers, Date & Time, Choice, Reference, Media, Capture, Contact, Advanced) each rendering a 3-column icon-grid of field-type buttons (icon + 9px label)
  - **Center (flexible, tinted `--surface2` background)**: max-width 680px canvas. Form title/description card at top, then each added field renders as a card: header row (drag-grip handle, type icon, label, required `*`, type badge, duplicate/delete icon buttons) + a live preview of that field type below. Empty state shows a large dashed-border placeholder with icon + copy when no fields exist. A dashed "+ Add Text Field" affordance sits at the bottom.
  - **Right (300px, scrollable)**: Properties panel — header shows field label + type badge, then 3 sub-tabs (**Properties / Validation / Logic**). Properties tab: Label, Placeholder (if applicable), Help Text, Default Value, Options list (if choice-type, with add/remove), then 5 toggles (Required, Read Only, Hidden, Searchable, Indexed). Validation tab: Min, Max, Pattern (regex, monospace), Custom Error Message. Logic tab: empty-state illustration + "Add Condition" button. Footer: full-width red-bordered "Delete Field" button. When no field is selected, shows a centered empty state instead.
- **Preview mode**: renders the form as an end-user would fill it (label + required asterisk + live field widget + help text), with a "Submit Form" button
- **Logic mode**: centered empty state (zap icon) with per-field visibility-rule rows once fields exist, plus "Add Rule"

### 4. Templates (compliance library)
- Header + search box; below it, a row of pill filter chips (one per domain: Legal & Compliance, Quality Management, Health & Safety, Maintenance, Security, Human Resources, Environment, Custom, plus "All") — active chip filled with accent color
- Responsive card grid (`repeat(auto-fill, minmax(320px,1fr))`, collapses to 280px min on tablet, 1 column on phone). Each template card: icon-in-tinted-square + name + domain tag chip, description paragraph, field-count + domain caption, two/three action buttons (**Use This Pack** / **Preview fields** / delete-icon for custom packs only), and a bottom strip of small pill "chips" (tags like "Worker Safety", "TN Factories Act")
- Clicking **Preview fields** opens a 340px right-side slide-in panel listing every field in that template (icon, label, type + required flag) with an "Activate This Pack" CTA at the bottom
- Clicking **Use This Pack**/Activate loads all of that template's fields into the Form Builder in Build mode, fully editable — nothing is locked
- **8 built-in templates** ship as reference content: Tamil Nadu Factory Act Compliance Checklist (25 fields), Maharashtra Shops & Establishments Compliance, Karnataka Factories Rules Compliance, Central Labour Codes Compliance Checklist, ISO 9001 QMS Audit, OSHA Workplace Safety Inspection, Preventive Maintenance Work Order, Visitor Entry & Exit Register, Workplace Incident & Accident Report, Employee Onboarding Form, Environmental Compliance Monitoring
- **Save as Template**: from the Form Builder toolbar, opens a modal (name input + Cancel/Save) that saves the current field set as a new deletable custom template

### 5. Responses
- Table of submitted forms: Form name, Submitted By, Plant, Date, Status badge, and an "Excel" download action per row (client-side CSV generation, opens cleanly in Excel)

### 6. Reports
- Similar table view purposed for bulk reporting: Form/Checklist, Submitted By, Plant, Date, Field count, Status, and a prominent per-row "Download" button (accent-filled). A header-level "Export All as Excel" primary button downloads every response as one consolidated CSV.
- **Export implementation reference** (already working in the prototype, portable as-is): builds a `Blob` of CSV text (UTF-8 BOM prefix so Excel renders special characters correctly) and triggers a synthetic anchor-click download. For production, generate real `.xlsx` (not just CSV) using a library like `exceljs` or `xlsx` (SheetJS) for proper formatting/formulas, ideally server-side so large exports don't block the browser.

### 7. Users
- Table: avatar (colored circle + initials) + name, email, role, department, status badge, Edit + overflow actions. Header has search + "Invite User" primary button.

### 8. Companies / Plants / Departments / Teams / Roles (org structure)
- All five share one generic table-screen pattern: header (title, count subtitle, search box, "New X" button) + full-width data table with columns specific to that entity (e.g., Plants: Name, Code, Company, Location, Capacity, Status)

### 9. Permissions
- Header + row of pill tabs, one per Role (Administrator, Form Editor, Compliance Auditor, Viewer)
- Below: a table with Module rows (Forms, Templates, Responses, Users, Companies & Plants, Reports, Settings) × View/Create/Edit/Delete columns. **Every cell is clickable** — a small rounded icon button (check = granted, x = revoked) that toggles that specific permission for the currently selected role. This is a live editable matrix, not read-only.

### 10. Settings
- **Accent Color** card: 4-column grid of 8 preset swatches (Royal Blue #2563EB, Emerald #059669, Deep Purple #7C3AED, Teal #0D9488, Navy #1E3A5F, Slate #64748B, Silver #94A3B8, Charcoal #1C1C1E) — each a circular swatch + label; selected swatch gets a 2px accent-colored border + tinted background. Include a "Custom" color-code input option (hex entry) alongside the presets in production.
- **Dark Mode** card: label + description + toggle switch (accent-colored track when on)
- **Platform Preferences** card: Language, Timezone, Date Format, Number Format rows, each a label + native `<select>`

### 11. Placeholder / Help screens
- Centered empty-state pattern: icon, title, "coming in the next phase" caption, "Go to Forms" secondary button — use this pattern for any module not yet built out.

## Interactions & Behavior

- **Sidebar**: collapsible (220px ↔ 54px, `width` transition `0.2s ease`); collapsed state shows icon-only nav with tooltips (`title` attr); on screens <720px wide, the sidebar becomes a fixed, full-height slide-over drawer (`position: absolute`, `z-index: 50`, drop shadow) triggered by a floating hamburger button top-left, with a semi-transparent backdrop (`rgba(0,0,0,.35)`) that closes it on click
- **Accent-color legibility rule**: because the user can pick ANY accent color (including very dark ones like Charcoal, or very light ones like Silver), never hard-code `color: accent` for text/icons on a themed surface. Compute a display-safe variant: in dark mode, if the chosen accent's perceptual luminance is below ~0.4, lighten it toward white by ~60%; in light mode, if luminance is above ~0.82, darken it toward black by ~55%. Apply this "legible accent" to text/icon usages (nav active state, links, tags, stat-card icons) while keeping the raw accent for solid-fill buttons (which always pair with white text) and border/background tints.
- **Drag-to-reorder** fields in the Form Builder canvas: native HTML5 drag/drop (`draggable`, `onDragStart` sets a data-transfer index, `onDragOver` prevents default, `onDrop` splices the array)
- **Field click** selects it and populates the right-hand Properties panel; **duplicate** clones with `" (Copy)"` suffix and auto-selects the clone; **delete** removes and clears selection if it was selected
- **Form/Template activation** fully replaces the builder's current field array — no merge — and switches the app to the Form Builder in Build mode
- **All toggles** (Required/ReadOnly/Hidden/Searchable/Indexed, Dark Mode, Permission cells) are simple boolean flips rendered as a sliding-knob pill (34–42px wide track, 15–19px circular knob, `transform: translateX(...)` transition `0.2s`)

## State Management
Minimum state shape needed (mirrors the prototype's flat state object):
- `auth`: `{ isAuthed, user, role }`
- `ui`: `{ nav (current screen), sidebarOpen, dark, accent, isMobile }`
- `builder`: `{ fields[], selectedFieldId, builderTab (build/logic/preview), currentFormName, currentFormDesc, dragSrcIndex }`
- `templates`: `{ packs[] (built-in + custom), search, domainFilter, previewPackId, activePackId }`
- `permissions`: `{ byRole: { admin: [...], editor: [...], auditor: [...], viewer: [...] }, selectedRole }`
- Server-fetched (via React Query): companies, plants, departments, teams, roles, users, responses, reports

## Design Tokens

### Colors (CSS custom properties, swap per theme)
- `--bg`: `#FAFAF8` light / `#111113` dark (Paper White)
- `--surface`: `#FFFFFF` light / `#1C1C1E` dark (cards)
- `--surface2`: `#F4F4F5` light / `#242426` dark (tinted backgrounds, table headers)
- `--border`: `#E4E4E7` light / `#303036` dark
- `--text`: `#09090B` light / `#F9FAFB` dark
- `--muted`: `#71717A` (both modes)
- `--accent`: user-selected, default `#2563EB` (Royal Blue)

### Status colors (fixed, do not theme)
- Success/Active/Published: bg `#DCFCE7`, text `#15803D`
- Warning/Review: bg `#FEF3C7`, text `#92400E`
- Error: `#EF4444` (danger buttons/delete actions), banner bg `#FEF2F2`/`#3F1D1D`, border `#FECACA`/`#7F1D1D`, text `#B91C1C`/`#FCA5A5`
- Inactive/Draft: bg `#F3F4F6`, text `#6B7280`
- Info: `#2563EB` family / use the active theme accent

### Typography
- Font: **Inter** (300/400/500/600/700 weights loaded from Google Fonts)
- Page Title: 21px / 700 / -0.5px letter-spacing
- Section/Card Title: 14–18px / 600–700
- Body: 12–13px / 400–500
- Caption/Label: 9.5–11px / 600–700, uppercase, 0.6–0.9px letter-spacing (for field labels, section headers)

### Spacing / Radius / Shadow
- Card radius: 10–12px; button radius: 6–8px; pill/badge radius: 20px (full)
- Card padding: 20–24px; table cell padding: 10–16px
- Card border: `1px solid var(--border)`; card shadow (light mode only): `0 1px 2-3px rgba(0,0,0,.04-.05)` — no shadow in dark mode
- No gradients, no glossy effects, anywhere

## Assets
- All icons are hand-authored inline SVGs (24×24 viewBox, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap/linejoin="round"`, no fill except a few solid dots) — functionally equivalent to **Lucide Icons**; swap 1:1 for the `lucide-react` package in production using the closest-matching icon names (e.g. the custom "shieldon" icon ≈ Lucide's `ShieldCheck`)
- No raster images/photos used — this is an entirely vector/typographic UI
- `manifest.json` (included) is a ready-to-use PWA manifest — reuse directly with `vite-plugin-pwa`

## Files
- `Form Engine.dc.html` — the full high-fidelity design reference (open directly in any browser)
- `manifest.json` — PWA manifest (icons, theme-color, start_url) ready to adapt
- `schema.sql` — reference PostgreSQL schema covering the User Engine (companies/plants/departments/teams/roles/permissions/users) and Form Engine (forms, form_fields with all 30+ types, responses, response_values, attachments), plus example Row Level Security policies wired to the permissions matrix and a seed for the four default roles. Works with either a custom Node/Prisma API or directly via PostgREST.
