---
name: HouseRush Project Context
description: Architecture, deployment, admin creds, env vars, DB state, and upcoming feature queue
type: project
---

## Deployment
- Frontend: Vercel (houserush.vercel.app), auto-deploys on push
- Backend: Railway (college-biding-production.up.railway.app), auto-deploys on push, root: /server
- Database: Turso persistent LibSQL cloud, survives Railway redeploys
- Site currently in maintenance mode (VITE_MAINTENANCE_MODE=true on Vercel)

## Admin Credentials
- Admin approval queue: /admin (password: houserush2024)
- Admin analytics: /admin/dashboard (password: creiguide2026)
- API admin key (x-admin-key header): houserush2024

## Test Accounts
- Student: alex.m@monmouth.edu / password123
- Landlord: sarah.chen@realty.com / password123

## DB State (as of 2026-03-30)
- 21 users (15 students, 6 landlords), 27 listings (need reset to 15), 166 bids

## Upcoming Build Queue (priority order)
1. Secure Lease Now — landlord sets fixed bypass price above starting bid
2. Group Bidding — roommate groups bid as one unit
3. Parent Access — student invites parent email for read-only view
4. In-App Messaging
5. Guides & Checklists page
6. Neighborhood Guides
7. Property Nicknames
8. Listing View Count
9. Annual Pricing Toggle

**Why:** User provided explicit priority list for next features.
**How to apply:** Build features in this order unless user says otherwise.
