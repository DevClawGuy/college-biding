# HouseRush — Off-Campus Student Housing Platform

The fastest way to find off-campus housing near Monmouth University. Students browse verified listings, place real-time bids, and move in with confidence. Think Zillow meets StubHub for college housing.

**Live site:** https://houserush.vercel.app

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite → Vercel
- **Backend:** Node.js + Express + TypeScript → Railway
- **Database:** Turso (LibSQL/SQLite cloud) — persists across Railway redeploys
- **Auth:** JWT-based (email + password), .edu email verification via Resend
- **Real-time:** Socket.io (live bid updates, auction events, notifications, messages)
- **Email:** Resend SDK (verification, winner notifications, landlord alerts, parent invites, group invites, contact form, admin reminders)
- **Maps:** Leaflet.js (OpenStreetMap) on listing detail pages
- **AI:** Pure algorithmic bid recommendation engine (no external API, zero cost)

## Features

### Core Auction System
- **Live Bidding** — Real-time bid updates via Socket.io, atomic race condition prevention (`UPDATE...WHERE current_bid < ?`)
- **Auto-Bid** — Set a max bid, system counter-bids automatically up to 20 iterations
- **Auction Extension** — Last-minute bids (within 5 min) extend auction by 5 minutes (anti-snipe)
- **Auction Close Job** — Runs every 60s, detects expired auctions, declares winners, sends emails to winner + landlord + losers
- **Secure Lease Now** — Landlord sets a fixed premium price; students can skip the auction and lock in the lease instantly
- **Group Bidding** — Roommate groups bid as one unit; leader creates group, invites members by email, places bids on behalf of the group

### AI & Analytics
- **AI Bid Recommendation Engine** — Distribution-based win probability, weighted comp analysis, competition scoring, urgency signals, 5-minute cache, one-click recommended bid action
- **Listing View Count** — Tracks unique student views per listing (deduplicated by user ID or IP), urgency tiers at 50+ and 100+ views
- **View Snapshots** — Time-series view velocity tracking for recommendation engine

### User Experience
- **Authentication** — Signup/login with .edu email verification, JWT auth, bcrypt password migration
- **Listings** — Browse, search, filter by price/beds/town/amenities, sort by ending soon/price/bids
- **Winner Notifications** — Confetti on win, email to winner and landlord via Resend
- **Dashboard** — Role-specific tabs: Students (My Bids, Messages, Saved, Notifications), Landlords (My Listings, Messages, Notifications)
- **In-App Messaging** — Real-time student-landlord messages per listing via Socket.io, unread count in navbar
- **Parent Access** — Student invites parent email for read-only view of saved listings and bid status (no login required)
- **Profile** — Update name, phone, parent access email
- **Favorites** — Save/unsave listings with deduplication (unique index)

### Landlord Tools
- **Create Listings** — Auction end date, image URLs, amenities, secure lease price, approval queue
- **Landlord Dashboard** — View all listings with winner details (name, email, phone), delete zero-bid listings
- **Landlord Bid Block** — Landlords cannot place bids; simplified view-only panel on other landlords' listings

### Admin
- **Listing Approval** — Approve/reject listings at /admin
- **Analytics Dashboard** — Live stats at /admin/dashboard (users, listings, bids, activity feed, auto-refreshes 30s)
- **User Outreach** — User table with filters (role, activity, bid count), search, bulk email reminders via Resend with `[first name]` personalization
- **Active User Tracking** — `last_seen_at` updated on every authenticated request
- **Test Data Management** — Seed/wipe test bidders and listings

### Content & Legal
- **Guides & Checklists** — 6 downloadable student housing guides (move-in essentials, lease red flags, roommate agreement, rental scams, apartment inspection, post-auction steps)
- **How It Works** — Step-by-step guide for students and landlords
- **Legal Pages** — Terms of Service, Privacy Policy, Contact
- **Maintenance Mode** — Toggle via `VITE_MAINTENANCE_MODE`, preview bypass via `?preview=houserush2024`, parent-view and guides always bypass

### Mobile & Polish
- **Mobile Responsive** — Full mobile bid flow, responsive grid, bottom-sheet bid modal
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

## Demo Accounts

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Student  | alex.m@monmouth.edu      | password123 |
| Landlord | sarah.chen@realty.com    | password123 |

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

### Bids (`/api/bids`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/bids/listing/:listingId    | Place a bid              |
| GET    | /api/bids/listing/:listingId    | Get bid history          |
| POST   | /api/bids/auto/:listingId       | Set auto-bid             |
| POST   | /api/bids/secure-lease/:listingId | Secure Lease Now       |
| GET    | /api/bids/my/bids               | Get user's bids          |

### Group Bidding (`/api/bid-groups`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/bid-groups                 | Create group             |
| GET    | /api/bid-groups/:listingId      | Get user's group         |
| POST   | /api/bid-groups/:groupId/join   | Join group               |
| DELETE | /api/bid-groups/:groupId/leave  | Leave/dissolve group     |
| POST   | /api/bid-groups/:groupId/bid    | Place group bid          |

### Messages (`/api/messages`)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/messages/unread-count      | Unread message count     |
| GET    | /api/messages/conversations     | All conversations        |
| GET    | /api/messages/:listingId        | Get thread               |
| POST   | /api/messages/:listingId        | Send message             |

### AI Recommendation (`/api/ai`)
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | /api/ai/bid-recommendation/:listingId | Generate recommendation  |
| GET    | /api/ai/bid-recommendation/:listingId | Get recommendation       |

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
| GET    | /api/admin/users                      | List all users + bid counts   |
| POST   | /api/admin/send-reminder              | Send email to selected users  |
| POST   | /api/admin/seed-test-bidders          | Create test bidders + bids    |
| POST   | /api/admin/wipe-test-bidders          | Remove test bidders + bids    |

## Project Structure

```
/client                      - React frontend (Vite)
  /src
    /components              - Logo, Navbar, Footer, BidModal, CreateGroupModal, ListingCard
    /pages                   - HomePage, ListingsPage, ListingDetailPage, DashboardPage,
                               CreateListingPage, ProfilePage, LoginPage, SignupPage,
                               AdminPage, AdminDashboardPage, ParentViewPage, GuidesPage,
                               VerifyEmailPage, HowItWorksPage, TermsPage, PrivacyPage,
                               ContactPage
    /hooks                   - useCountdown
    /store                   - authStore (Zustand)
    /lib                     - api (Axios), socket (Socket.io client)
  /public                    - Static assets
  vercel.json                - Catch-all rewrite for React Router
/server                      - Express backend
  /src
    /db                      - schema.ts (Drizzle ORM), init.ts (migrations), index.ts (client)
    /routes                  - auth, listings, bids, bidGroups, messages, ai, favorites,
                               notifications, admin, contact, parentAccess
    /middleware               - JWT auth (+ last_seen_at tracking)
    /jobs                    - auctionClose (runs every 60s)
    /lib                     - email (Resend), recommendation (AI engine)
/tests                       - Playwright test specs
/thunder-client              - API request examples
```

## Database

Hosted on Turso (persistent LibSQL cloud). Survives Railway redeploys.

**Tables:** users, listings, bids, auto_bids, notifications, favorites, bid_groups, bid_group_members, messages, listing_views, view_snapshots

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
- **Every commit must end with:** `git add . && git commit -m "description" && git push`
