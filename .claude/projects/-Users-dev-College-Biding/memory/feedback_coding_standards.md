---
name: Coding Standards
description: Strict coding rules for HouseRush — TS strict, Tailwind only, Thunder Client, Playwright, LibSQL syntax
type: feedback
---

- TypeScript strict mode — no implicit any, no type assertions without justification
- Tailwind only for styling — no inline styles, no custom CSS files
- All API routes must have try/catch error handling
- All new DB columns need migrations in init.ts wrapped in try/catch
- Socket.io events: snake_case (bid_update, auction_ended, auction_extended)
- Follow existing file structure: server/src/routes/, server/src/jobs/, server/src/lib/, client/src/pages/, client/src/components/
- Every new API endpoint needs a Thunder Client example
- Every new feature needs a Playwright test in /tests
- LibSQL/Turso syntax: use ? placeholders, not $1/$2
- Use named imports, not default imports for libraries (bundle size)
- Fix all TypeScript errors before committing
- Use relative imports from src/ root
- Document new env vars in .env.example
- Add TODO/FIXME comments where follow-up work is needed

**Why:** User has specific VS Code extensions enforcing these rules; consistency across the project.
**How to apply:** Every code change must follow these rules. Check before committing.
