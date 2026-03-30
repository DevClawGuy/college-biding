# HouseRush — Off-Campus Student Housing Platform

The fastest way to find off-campus housing near Monmouth University. Students browse verified listings, place real-time bids, and move in with confidence. Think Zillow meets StubHub for college housing.

**Live site:** https://houserush.vercel.app

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite → Vercel
- **Backend:** Node.js + Express + TypeScript → Railway
- **Database:** Turso (LibSQL/SQLite cloud) — persists across Railway redeploys
- **Auth:** JWT-based (email + password), .edu email verification via Resend
- **Real-time:** Socket.io (live bid updates, auction events, notifications)
- **Email:** Resend SDK (verification emails, winner notifications, landlord alerts)
- **Maps:** Leaflet.js (OpenStreetMap) on listing detail pages

## Features

- **Authentication** — Signup/login with .edu email verification, JWT auth
- **Listings** — Browse, search, filter by price/beds/town/amenities, sort by ending soon/price/bids
- **Live Bidding** — Real-time bid updates via Socket.io, atomic race condition prevention
- **Auto-Bid** — Set a max bid, system counter-bids automatically up to 20 iterations
- **Auction Extension** — Last-minute bids (within 5 min) extend auction by 5 minutes (anti-snipe)
- **Auction Close Job** — Runs every 60s, detects expired auctions, declares winners, sends emails
- **Winner Notifications** — Confetti on win, email to winner and landlord via Resend
- **Dashboard** — My Bids (Winning/Outbid/Won/Lost), My Listings, Saved, Notifications
- **Landlord Flow** — Create listings with auction end date, image URLs, amenities, approval queue
- **Admin Panel** — Approve/reject listings at /admin, analytics dashboard at /admin/dashboard
- **Maintenance Mode** — Toggle via VITE_MAINTENANCE_MODE env var, preview bypass via ?preview=
- **Legal Pages** — Terms of Service, Privacy Policy, How It Works, Contact
- **Mobile Responsive** — Full mobile bid flow, responsive grid, bottom-sheet bid modal

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
curl -X POST http://localhost:3000/api/admin/seed \
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

### Auth
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/auth/signup                | Create account           |
| POST   | /api/auth/login                 | Login                    |
| GET    | /api/auth/me                    | Get current user         |
| PUT    | /api/auth/me                    | Update profile           |
| GET    | /api/auth/verify-email?token=   | Verify .edu email        |

### Listings
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/listings                   | Browse (with filters)    |
| GET    | /api/listings/:id               | Get listing details      |
| POST   | /api/listings                   | Create listing           |
| PUT    | /api/listings/:id               | Update listing           |
| DELETE | /api/listings/:id               | Delete listing           |
| GET    | /api/listings/my/listings       | Landlord's listings      |

### Bids
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/bids/listing/:listingId    | Place a bid              |
| GET    | /api/bids/listing/:listingId    | Get bid history          |
| POST   | /api/bids/auto/:listingId       | Set auto-bid             |
| GET    | /api/bids/my/bids               | Get user's bids          |

### Favorites
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /api/favorites                  | Get favorites            |
| POST   | /api/favorites/:listingId       | Add favorite             |
| DELETE | /api/favorites/:listingId       | Remove favorite          |

### Notifications
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | /api/notifications                    | Get notifications        |
| GET    | /api/notifications/unread-count       | Get unread count         |
| PUT    | /api/notifications/:id/read           | Mark as read             |
| PUT    | /api/notifications/read-all           | Mark all as read         |

### Admin
| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| POST   | /api/admin/seed                       | Safe seed (non-destructive) |
| POST   | /api/admin/reset                      | Full wipe + reseed       |
| GET    | /api/admin/analytics                  | Live analytics data      |
| GET    | /api/admin/listings/pending           | Pending approval queue   |
| POST   | /api/admin/listings/:id/approve       | Approve listing          |
| POST   | /api/admin/listings/:id/reject        | Reject listing           |

## Project Structure
/client                  - React frontend (Vite)
/src
/components          - Reusable UI components (Navbar, Footer, BidModal)
/pages               - Page components
/hooks               - Custom React hooks (useCountdown, useSocket)
/lib                 - API client, socket config
/public                - Static assets (og-image.svg)
vercel.json            - Catch-all rewrite for React Router
/server                  - Express backend
/src
/db                  - LibSQL schema, init, migrations
/routes              - API route handlers
/middleware          - JWT auth middleware
/jobs                - Auction close job (runs every 60s)
/lib                 - Email (Resend), socket helpers

## Database

Hosted on Turso (persistent LibSQL cloud). Survives Railway redeploys.

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
