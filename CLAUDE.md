# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

FormOS is an enterprise no-code form engine platform for factories/plants. It has a React frontend (currently client-side only with Zustand mock data) and a PostgreSQL schema ready for backend integration. The app covers: auth, dashboard, form builder with 30+ field types, compliance template library (11 built-in packs), org structure tables (companies/plants/departments/teams/roles), editable permissions matrix, responses/reports with CSV export, and a theme system with 8 accent colors + dark mode.

## Commands

```bash
cd app
npm run dev        # Vite dev server (localhost:5173)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # serve production build
npx tsc --noEmit   # type-check without emitting
```

No test runner is configured yet.

## Architecture

### Frontend (`app/`)

React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 (via `@tailwindcss/vite` plugin). Styling uses inline `style` objects with CSS custom properties — not Tailwind utility classes. No React Router is wired yet; navigation is Zustand state (`nav` string).

**State**: Single Zustand store (`app/src/store/useStore.ts`) holds all app state — auth, UI, builder, templates, permissions, and seed data for all entities. No API calls exist; all data is in-memory. The store is a flat object (not sliced), matching the design prototype's pattern.

**Screen routing**: `App.tsx` renders `<ScreenSwitch>` which switches on `useStore.nav` to render the active screen component. Sidebar nav items call `setNav('screenKey')`.

**Theme system**: CSS custom properties (`--accent`, `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--muted`) set on the root div via `getThemeVars()` from `app/src/lib/theme.ts`. `legibleAccent()` adjusts accent color luminance so text/icons remain readable on themed surfaces — dark accents lighten in dark mode, light accents darken in light mode.

**Form Builder** (`FormBuilder.tsx`, ~1370 lines): 3-panel layout (232px field library | flex canvas | 300px properties panel). Build/Logic/Preview tabs. Fields are added from a categorized palette, rendered as draggable cards with live previews, and configured via the properties panel (label, placeholder, options, toggles, validation).

**Templates** (`app/src/data/templatePacks.ts`): 11 built-in compliance template packs with full field definitions. Activating a pack replaces the builder's field array and navigates to the builder. Custom templates can be saved from the builder via a modal.

### Database (`schema.sql`)

PostgreSQL schema with two engines:
- **User Engine**: companies → plants → departments → teams, plus roles, permissions (CRUD matrix), users
- **Form Engine**: forms (templates are forms with `is_template=true`) → form_fields (30+ types, JSONB for options/validation/logic) → responses → response_values (JSONB) → response_attachments

Includes RLS policy examples for PostgREST integration.

### Key Files

- `app/src/store/types.ts` — All TypeScript interfaces (FormField, TemplatePack, entity types)
- `app/src/lib/csv.ts` — CSV export with UTF-8 BOM for Excel compatibility
- `app/src/components/layout/Sidebar.tsx` — Collapsible sidebar (220px ↔ 54px, mobile overlay <720px)
- `app/src/components/layout/AuthScreen.tsx` — Login/signup with client-side mock auth
- `manifest.json` — PWA manifest (root level, not yet wired to Vite PWA plugin)
- `Form Engine.dc.html` — Design prototype reference (open in browser to see exact UI, do not embed in app)

## Design Constraints

- Icons: `lucide-react`, 24x24 viewBox, 1.75px stroke
- No gradients, no glossy effects anywhere
- Card radius 10-12px, button radius 6-8px, pill/badge radius 20px
- Font: Inter (loaded from Google Fonts in `index.html`)
- Status colors are fixed (not themed): green #DCFCE7/#15803D, yellow #FEF3C7/#92400E, red #EF4444, gray #F3F4F6/#6B7280
- Sidebar nav keys must match store `nav` values exactly (e.g., templates screen uses key `packs`, not `templates`)
