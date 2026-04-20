# HouseRush — Off-Campus Student Housing Platform

The Zestimate for college students. 2,716 university portals live nationally with real rent data, fair market benchmarks, and verified off-campus listings. Free for students. Free for housing providers.

**Live site:** https://houserush.app
**Vercel backup:** https://houserush.vercel.app

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite → Vercel
- **Backend:** Node.js + Express + TypeScript → Railway
- **Database:** Turso (LibSQL/SQLite cloud) — persists across Railway redeploys
- **ORM:** Drizzle ORM — type-safe database queries
- **Data Fetching:** TanStack Query (React Query v5) — data fetching and caching layer
- **Auth:** JWT-based (email + password), .edu email verification via Resend
- **Real-time:** Socket.io (live updates, notifications, messages)
- **Email:** Resend SDK — transactional email only (welcome, verification, notifications). Never used for cold outreach.
- **Maps:** Leaflet.js (OpenStreetMap) on listing detail pages
- **AI:** Claude API (Haiku 4.5) — Fair Housing listing linter (planned). Algorithmic bid recommendation engine (live, zero API cost).

## Features

### Interest Expression System
Students express interest in listings with an optional rent suggestion. No bidding. No auctions. Legally clean interest expressions only.

### Data Moat
- 2,716 university portals with HUD Fair Market Rent data
- RentCheck scoring: per-bed price vs HUD FMR on every listing (score 1-5)
- IPEDS housing cost data: 2,236 universities
- ~450 universities with Wikimedia campus hero photos
- Drifting university name ticker on every portal hero

### University Portals
- Dynamic school colors on every portal hero
- Combined Rent Data & Good to Know accordion
- Federal Rent Guide (FMR) bedroom breakdown
- Street View metadata for 79% of universities

### Analytics
- **Listing View Count** — Tracks unique student views per listing (deduplicated by user ID or IP), urgency tiers at 50+ and 100+ views
- **View Snapshots** — Time-series view velocity tracking for recommendation engine

### User Experience
- **Authentication** — Signup/login with .edu email verification, JWT auth, bcrypt password migration
- **Listings** — Browse, search, filter by price/beds/town/amenities, sort by ending soon/price
- **Dashboard** — Role-specific tabs: Students (My Bids, Messages, Saved, Notifications), Landlords (My Listings, Messages, Notifications)
- **In-App Messaging** — Real-time student-landlord messages per listing via Socket.io, unread count in navbar
- **Parent Access** — Student invites parent email for read-only view of saved listings (no login required)
- **Profile** — Update name, phone, parent access email
- **Favorites** — Save/unsave listings with deduplication (unique index)

### Landlord Tools
- **Create Listings** — Image URLs, amenities, approval queue
- **Landlord Dashboard** — View all listings, delete zero-interest listings
- **Landlord Block** — Landlords cannot express interest; simplified view-only panel on other landlords' listings

### Admin
- **Listing Approval** — Approve/reject listings at /admin
- **Analytics Dashboard** — Live stats at /admin/dashboard (users, listings, activity feed, auto-refreshes 30s)
- **User Outreach** — User table with filters (role, activity), search, bulk email reminders via Resend with `[first name]` personalization
- **Active User Tracking** — `last_seen_at` updated on every authenticated request

### Content & Legal
- **Guides & Checklists** — 6 downloadable student housing guides (move-in essentials, lease red flags, roommate agreement, rental scams, apartment inspection, post-auction steps)
- **How It Works** — Step-by-step guide for students and landlords
- **Legal Pages** — Terms of Service, Privacy Policy, Contact
- **Maintenance Mode** — Toggle via `VITE_MAINTENANCE_MODE`, preview bypass via `?preview=houserush2024`, parent-view and guides always bypass

### Mobile & Polish
- **Mobile Responsive** — Full mobile flow, responsive grid
- **Mobile Avatar** — User avatar + logout always visible on mobile navbar
- **Open Graph** — Dynamic OG meta tags per listing
- **Reusable Logo** — SVG house + lightning bolt component used across all pages

## Environment Variables

### Frontend (Vercel)
VITE_API_URL=https://college-biding-production.up.railway.app/api
VITE_MAINTENANCE_MODE=false

### Backend (Railway)
JWT_SECRET=
NODE_ENV=production
ADMIN_KEY=houserush2024
PORT=8080
TURSO_DATABASE_URL=libsql://houserush-devclawguy.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=
RESEND_API_KEY=
CONTACT_EMAIL=contact@houserush.app
CLIENT_URL=https://houserush.app
GOOGLE_STREET_VIEW_KEY=

## Quick Start (Local Development)

### 1. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Set up local environment
```bash
# server/.env
JWT_SECRET=localsecret
NODE_ENV=development
ADMIN_KEY=houserush2024
TURSO_DATABASE_URL=file:./houserush.db
GOOGLE_STREET_VIEW_KEY=your_key_here
CONTACT_EMAIL=contact@houserush.app
```

### 3. Start development servers
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

App runs at http://localhost:5173

### 4. Seed the database
```bash
curl -X POST http://localhost:3001/api/admin/seed \
  -H "x-admin-key: houserush2024"
```

## Demo Access

Demo access: use `?preview=houserush2024` to bypass maintenance mode on houserush.app

## Admin Access

| Page                | URL                              | Password       |
|---------------------|----------------------------------|----------------|
| Listing Approval    | /admin                           | houserush2024  |
| Analytics Dashboard | /admin/dashboard                 | creiguide2026  |

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/auth/signup                | Create account           |
| POST   | /api/auth/login                 | Login                    |
| GET    | /api/auth/me                    | Get current user         |
| PUT    | /api/auth/me                    | Update profile           |
| GET    | /api/auth/verify-email?token=   | Verify .edu email        |

### Listings (`/api/listings`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/listings                   | Browse (with filters)    |
| GET    | /api/listings/:id               | Get listing + track view |
| POST   | /api/listings                   | Create listing           |
| PUT    | /api/listings/:id               | Update listing           |
| DELETE | /api/listings/:id               | Delete listing           |
| GET    | /api/listings/my/listings       | Landlord's listings      |

### Interest (`/api/interest`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/interest/:listingId        | Express interest         |
| GET    | /api/interest/:listingId        | Get expressions          |

### Universities (`/api/universities`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/universities               | List all universities    |
| GET    | /api/universities/:slug         | Get university portal    |

### Messages (`/api/messages`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/messages/unread-count      | Unread message count     |
| GET    | /api/messages/conversations     | All conversations        |
| GET    | /api/messages/:listingId        | Get thread               |
| POST   | /api/messages/:listingId        | Send message             |

### Parent Access (`/api/parent-access`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/parent-access/:token       | Read-only student view   |

### Favorites (`/api/favorites`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/favorites                  | Get favorites            |
| POST   | /api/favorites/:listingId       | Add favorite             |
| DELETE | /api/favorites/:listingId       | Remove favorite          |
| GET    | /api/favorites/check/:listingId | Check if favorited       |

### Notifications (`/api/notifications`)
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | /api/notifications                    | Get notifications        |
| GET    | /api/notifications/unread-count       | Get unread count         |
| PUT    | /api/notifications/:id/read           | Mark as read             |
| PUT    | /api/notifications/read-all           | Mark all as read         |

### Contact (`/api/contact`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/contact                    | Submit contact form      |

### Admin (`/api/admin`)
| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| POST   | /api/admin/seed                       | Safe seed (non-destructive)   |
| POST   | /api/admin/reset                      | Full wipe + reseed            |
| GET    | /api/admin/analytics                  | Live analytics data           |
| GET    | /api/admin/listings/pending           | Pending approval queue        |
| POST   | /api/admin/listings/:id/approve       | Approve listing               |
| POST   | /api/admin/listings/:id/reject        | Reject listing                |
| POST   | /api/admin/clear-listings             | Wipe all listings (keep users)|
| POST   | /api/admin/seed-test-listings         | Insert 3 test listings        |
| GET    | /api/admin/users                      | List all users                |
| POST   | /api/admin/send-reminder              | Send email to selected users  |

## Project Structure

```
/client                      - React frontend (Vite)
  /src
    /components              - Logo, Navbar, Footer, ListingCard, etc.
    /pages                   - HomePage, ListingsPage, ListingDetailPage, DashboardPage,
                               CreateListingPage, ProfilePage, LoginPage, SignupPage,
                               AdminPage, AdminDashboardPage, ParentViewPage, GuidesPage,
                               VerifyEmailPage, HowItWorksPage, TermsPage, PrivacyPage,
                               ContactPage, UniversitiesPage, UniversityPortalPage
    /hooks                   - useCountdown
    /store                   - authStore (Zustand)
    /lib                     - api (Axios), socket (Socket.io client), rentcheck.ts,
                               recommendation.ts
  /public                    - Static assets
  vercel.json                - Catch-all rewrite for React Router
/server                      - Express backend
  /src
    /db                      - schema.ts (Drizzle ORM), index.ts (client)
    /routes                  - auth, listings, universities, interest, contact,
                               messages, favorites, notifications, admin, parentAccess
    /middleware               - JWT auth (+ last_seen_at tracking)
    /jobs                    - auctionClose (runs every 60s)
    /lib                     - email (Resend), recommendation (AI engine)
    /scripts                 - 17 data scripts including IPEDS backfill, HUD FMR seeding,
                               Wikimedia/Google hero image fetching, color seeding,
                               ZORI backfill
/tests                       - Playwright test specs
/thunder-client              - API request examples
```

## Database

Hosted on Turso (persistent LibSQL cloud). Survives Railway redeploys.

**Tables:** users, listings, bids, autoBids, notifications, favorites, bidGroups, bidGroupMembers, messages, listingViews, viewSnapshots, universities, universityMarketData, expressionsOfInterest

**universities table:** 2,716 rows with IPEDS data, HUD FMR market data, school colors, hero image URLs, ZORI rent trends

**To reset and reseed production:**
```bash
# Full wipe + reseed (destructive)
curl -X POST https://college-biding-production.up.railway.app/api/admin/reset \
  -H "x-admin-key: houserush2024"

# Safe seed only (non-destructive, skips existing)
curl -X POST https://college-biding-production.up.railway.app/api/admin/seed \
  -H "x-admin-key: houserush2024"
```

## Deployment

- **Frontend:** Push to GitHub → auto-deploys to Vercel
- **Backend:** Push to GitHub → auto-deploys to Railway (root: /server)

## Legal & Compliance

- Independent housing marketplace. Not affiliated with or endorsed by any university.
- Not a real estate broker, agent, or property manager under NJ law.
- HUD FMR and IPEDS data sourced from federal public databases (NCES, HUD).
- Campus photos sourced from Wikimedia Commons under respective Creative Commons licenses.
- Interest Expression System: non-binding, landlord retains full selection discretion.
