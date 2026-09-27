<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🤖 Tinggle Agent Operating Guidelines & Architecture Playbook (AGENTS.md)

Welcome, Agent. This document outlines the core architecture, design principles, mathematical invariants, security standards, and behavioral protocols for AI agents and autonomous contributors working on the **Tinggle** codebase.

---

## 🎯 Project Mission & Core Invariants

Tinggle is a **Civic Trust & Verification Layer for Emergency Dispatch**. It bridges eyewitnesses, citizens, and municipal emergency dispatchers.

### The 5 Non-Negotiable Invariants:
1. **Zero-Delay Emergency SOS**: Genuine emergency distress calls must NEVER be blocked by OTP verification delays or client-side latency. Anti-spam protections (honeypots, E.164 syntax, sliding-window rate limiters) operate asynchronously or invisibly.
2. **Mathematical Credibility Integrity**: All trust score computations and citizen reputation adjustments are deterministic and managed strictly via [`lib/credibility.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/credibility.lib.js). Never hardcode scores or introduce arbitrary multipliers in UI components.
3. **Z-Index Layering Hierarchy**: Fullscreen modals (e.g. image previews, SOS beacons, lightboxes) must ALWAYS use high z-index (`z-[9999]` or `z-[99999]`) to sit above Leaflet map panes and controls (`z-index: 400`–`1000`).
4. **Proximity-First Sorting**: Ongoing emergencies near the citizen and active squads en route take strict visual precedence. Solved issues and debunked hoaxes automatically sink to the bottom.
5. **Database Schema Resilience**: Supabase database queries must handle optional or partially migrated columns gracefully using fallback metadata. Never throw uncaught 500 errors if an optional column is missing.

---

## 🧱 Technology Stack & Technical Conventions

| Component | Technology | Agent Conventions |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.6 (Turbopack) | Use App Router (`app/`). Mark interactive components with `'use client'`. Server actions and route handlers live in `app/api/`. |
| **UI & Styling** | React 19 + Tailwind CSS v4 | Use custom theme tokens (`bg-[#080d17]`, `border-white/10`). Use modern CSS (`bg-linear-to-*`, backdrop filters). Never inject external UI libraries without necessity. |
| **GIS & Mapping** | Leaflet / React-Leaflet | Always import dynamically (`next/dynamic` with `{ ssr: false }`) to avoid `window is not defined` hydration errors. Map container must have explicit height. |
| **Database & Realtime** | Supabase (PostgreSQL) | Use `lib/db.lib.js` for server/route handlers (service role). Use `lib/supabase-browser.lib.js` for client-side realtime subscriptions. |
| **Authentication** | Clerk Auth | Wrap client state with Clerk hooks (`useUser`, `useAuth`). Sync user records into Supabase `users` table via `users.lib.js`. |
| **Icons & Audio** | Lucide React + Web Audio API | Use Lucide icons. Audio alarm beacons are synthesized using native browser Web Audio API (`AudioContext`). |

---

## 🗂 Codebase Map & Directory Topology

```
tinggle/
├── app/
│   ├── (main)/
│   │   ├── page.js                    # Dual-feed citizen home & interactive GIS radar
│   │   ├── incident/[id]/page.js      # Dossier deep-dive, photo lightbox & comment room
│   │   ├── profile/page.js            # User profile, OTP phone verification & reputation audit
│   │   ├── search/page.js             # Incident archive & multi-criteria search explorer
│   │   └── admin/page.js              # Command HQ, triage matrix & squad dispatch
│   ├── api/
│   │   ├── incidents/                 # GET (feed), POST (report), PATCH (dispatch/hoax), DELETE
│   │   ├── incidents/[id]/vote/       # GET (vote state), POST (upvote/dispute)
│   │   ├── incidents/[id]/comments/   # GET, POST incident comments
│   │   ├── sos/                       # POST /broadcast (panic beacon), POST /resolve
│   │   ├── user/profile/              # GET, PATCH user profile & reputation audit
│   │   ├── user/phone/                # POST phone number update
│   │   ├── user/phone/otp/            # POST send/verify OTP (dev demoCode included)
│   │   ├── watchlist/                 # Pinned citizen neighborhoods
│   │   └── locations/                 # Location auto-complete suggestions
│   ├── layout.js                      # Root shell with ClerkProvider, Header, & Footer
│   └── globals.css                    # Tailwind CSS v4 styling & dark theme tokens
├── components/
│   ├── Header.jsx                     # Topbar, live search auto-complete & SOS trigger
│   ├── admin-command/                 # Command HQ: AdminDashboardClient, ActiveThreatSectorMap, HeroIncidentDossier
│   ├── citizen-portal/                # Feed components: IncidentCard, IncidentDetailView, LiveIncidentMap, IncidentReportForm
│   └── emergency/                     # Floating SOS button, EmergencySosModal, audio siren
├── hooks/
│   └── useGeoLocation.js              # High-accuracy GPS watcher with Haversine distance calculator
└── lib/
    ├── credibility.lib.js             # Mathematical trust scoring & reputation engine
    ├── phone-validation.lib.js        # E.164 phone validation, honeypot traps & 45s rate limiter
    ├── db.lib.js                      # Server-side Supabase client
    ├── supabase-browser.lib.js        # Client-side Supabase Realtime client
    └── users.lib.js                   # User lookup & database upsert utilities
```

---

## 📐 Mathematical Credibility & Reputation Guidelines

When reading or modifying logic in [`lib/credibility.lib.js`](file:///d:/Bit/and/Build_OD_Techbies/tinggle/lib/credibility.lib.js), strictly observe:

### 1. Incident Trust Score (0% – 100%)
- **Base Score**: `12%` initial uncorroborated trust.
- **Remote Upvotes**: `+2.5%` per vote (max `+20%`).
- **Local Eyewitness Upvotes** (within 6 km): `+8%` per vote (max `+32%`).
- **Photo Attached**: `+8%`.
- **Official Dispatch** (Help en route): `+18%`.
- **Dispute Penalty**: `-20%` per citizen dispute (max `-60%`).
- **Debunked Hoax**: Forced immediately to `0%`.

### 2. Citizen Reputation Index (Base 50)
- New users start at **`50 points`**.
- Unadjudicated reports do NOT grant points (prevents upvote farming).
- **Admin Dispatched**: `+2 points`.
- **Officially Resolved**: `+3 points`.
- **Admin Marks Hoax**: `-6 points` (within 5–7 point penalty window).
- **Voter Accuracy Scale**: Correct upvoters/disputers receive `+1 to +3 points` based on category severity and eyewitness proximity; incorrect voters are penalized `-1 to -2 points`.
- **Posting Ban Rule**: Users with score `< 35` OR whose last 3 consecutive reports were hoaxes are prohibited from posting (voting only).

---

## 🛡 Layering & Z-Index Safety Protocol

Leaflet map components render DOM containers with high z-indices:
- Tile pane: `z-index: 200`
- Overlay pane: `z-index: 400`
- Shadow pane: `z-index: 500`
- Marker pane: `z-index: 600`
- Tooltip pane: `z-index: 650`
- Popup pane: `z-index: 700`
- Leaflet top/bottom controls (zoom buttons, attributions): `z-index: 1000`

### Mandatory Z-Index Standards:
- Sticky Navigation/Subheader: `z-30`
- Floating SOS Panic Button: `z-40`
- Flyout Menus & Tooltips: `z-50`
- Emergency SOS Modal: `z-[9999]`
- Fullscreen Image Previews & Lightboxes: `z-[99999]`

Always attach `onClick={(e) => e.stopPropagation()}` to modal content wrappers to prevent accidental dismissal when clicking on the content container itself.

---

## 🚀 Quality Assurance & Agent Checklist

Before completing any task, ensure:
1. `npx next build` passes with exit code 0.
2. No React hydration mismatches or unescaped JSX entities.
3. Leaflet map components are loaded dynamically with `{ ssr: false }`.
4. All API route handlers return consistent `{ success: true|false, ... }` JSON structures.
5. All UI state changes reflect cleanly in both desktop and mobile viewports.
