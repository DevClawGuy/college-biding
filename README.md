# DormBid - Real-Time Student Housing Auction Platform

A full-stack real estate bidding web app for college students. Browse apartments near campus, place competitive bids in real-time, and win your perfect home.

## Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite with Drizzle ORM
- **Auth:** JWT-based (email + password)
- **Real-time:** Socket.io for live bid updates
- **Maps:** Leaflet.js (OpenStreetMap)

## Features

- **Authentication** - Sign up/login with .edu email verification badge
- **Listings** - Browse, search, filter, and sort property listings
- **Live Bidding** - Place bids with real-time updates via WebSocket
- **Auto-Bid** - Set a maximum bid and let the system bid for you
- **Dashboard** - Track your bids (active/won/lost), favorites, and notifications
- **Landlord Flow** - Create and manage auction listings
- **Maps** - View property locations on interactive maps
- **Mobile Responsive** - Works on all screen sizes

## Quick Start

### 1. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Seed the database

```bash
cd server
npm run seed
```

### 3. Start the development servers

In two terminal windows:

```bash
# Terminal 1 - Start the backend
cd server
npm run dev

# Terminal 2 - Start the frontend
cd client
npm run dev
```

The app will be available at **http://localhost:5173**

### Demo Accounts

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Student  | alex.m@bu.edu            | password123 |
| Landlord | sarah.chen@realty.com    | password123 |

## Project Structure

```
/client          - React frontend (Vite)
  /src
    /components  - Reusable UI components
    /pages       - Page components
    /store       - Zustand state management
    /hooks       - Custom React hooks
    /lib         - API client, socket config
/server          - Express backend
  /src
    /db          - Drizzle schema & database
    /routes      - API route handlers
    /middleware   - Auth middleware
/shared          - Shared TypeScript types
```

## API Endpoints

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | /api/auth/signup          | Create account           |
| POST   | /api/auth/login           | Login                    |
| GET    | /api/auth/me              | Get current user         |
| GET    | /api/listings             | List all (with filters)  |
| GET    | /api/listings/:id         | Get listing details      |
| POST   | /api/listings             | Create listing           |
| PUT    | /api/listings/:id         | Update listing           |
| GET    | /api/bids/listing/:id     | Get bids for listing     |
| POST   | /api/bids/listing/:id     | Place a bid              |
| POST   | /api/bids/auto/:id        | Set auto-bid             |
| GET    | /api/bids/my/bids         | Get user's bids          |
| GET    | /api/favorites            | Get favorites            |
| POST   | /api/favorites/:id        | Add favorite             |
| DELETE | /api/favorites/:id        | Remove favorite          |
| GET    | /api/notifications        | Get notifications        |
| PUT    | /api/notifications/:id/read | Mark notification read |

## Seed Data

The seed script generates:
- 5 landlord accounts
- 15 student accounts across 10 universities
- 12 realistic listings in Boston, Austin, LA, NYC, and Chicago
- Bid history with 3-10 bids per listing
- Favorites and notifications
