# Apply Board

A small full-stack app for tracking internship applications. Add an application, move it through
`wishlist → applied → interview → offer / rejected`, keep notes, see which deadlines are close and export
them to your calendar as an `.ics` file.

![Board with demo data](docs/board.png)

*Screenshot taken from the running app with the built-in demo account (fictional companies).*

## Features

- Accounts: email + password (bcrypt, 12 rounds), random session tokens stored only as SHA-256 hashes,
  `HttpOnly` + `SameSite=Lax` cookie, 7-day sessions, a limit of 5 failed logins per email per 15 minutes.
- Board with five status columns, add / edit status / edit notes / delete.
- Summary: totals, response rate (share of submitted applications that got an interview, offer or rejection),
  deadlines in the next 14 days.
- Calendar export: `GET /api/applications/export` returns RFC 5545 all-day events (escaped and line-folded).
- Demo mode: one click creates a throw-away account filled with fictional data. Set `ENABLE_DEMO=0` to hide it.
- Every query is scoped to the signed-in user and parameterised; input is validated with Zod at the API boundary.

## Tech

Next.js 15 (App Router) · React 19 · TypeScript (strict) · SQLite via `better-sqlite3` · Zod · bcryptjs ·
Vitest · ESLint · GitHub Actions.

## Run it

Requires Node.js 22.

```bash
npm ci
cp .env.example .env.local   # optional; defaults work
npm run dev                  # http://localhost:3000
```

The SQLite file is created at `DATABASE_PATH` (default `./data/app.db`). The schema is created with
`CREATE TABLE IF NOT EXISTS`, so starting the app twice is safe. No secret or API key is needed.

## Tests

```bash
npm test            # Vitest: 25 tests, in-memory SQLite
npm run lint
npm run typecheck
npm run build
```

The tests cover validation, per-user data isolation, SQL in text fields, status stats, the `.ics` output
(escaping, folding, year boundary), login throttling, session expiry, CSRF rejection and the demo account.
`npm test` found a real bug while this was built: a "partial update" schema inherited the default status,
so editing only the notes would have reset the status to `wishlist`; it is fixed and has a regression test.

## Architecture

```
src/lib/db.ts            opens SQLite, creates tables (idempotent)
src/lib/schema.ts        Zod schemas and types
src/lib/auth.ts          register / login / sessions / login throttling
src/lib/applications.ts  CRUD scoped by user, stats
src/lib/ics.ts           calendar export
src/lib/handlers.ts      request handlers: (db, Request) -> Response, no framework needed to test them
src/app/api/**/route.ts  thin Next.js routes that call the handlers
src/app/**               pages: sign-in and the board
tests/                   Vitest suites
```

Handlers take the database and a standard `Request`, so the API tests run without starting a server.

## Limits and ideas

- The login throttle is in memory, so it resets on restart and is per server process.
- Status changes use a select box, not drag-and-drop.
- English only for now; the layout uses logical CSS properties so an Arabic/RTL version is possible.
- Not deployed anywhere yet: it needs a Node server with a writable disk for the SQLite file.
- The GitHub Actions workflow in `.github/workflows/ci.yml` had not run yet when this README was written.
