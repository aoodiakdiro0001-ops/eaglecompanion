# AGENTS.md

## Project

Eagle Companion is a Next.js 15 (App Router) + TypeScript app with SQLite via `@libsql/client` (local file, or Turso remotely) and Tailwind. It is a consent-based device-status dashboard with optional screen sharing. It must never become a covert monitoring tool.

## Commands

```bash
# Install dependencies
npm install

# Development server on port 3000
npm run dev

# Type check
npm run lint

# Tests (Vitest, in-memory database)
npm test

# Production build
npm run build

# Production server (after build)
npm start
```

Run `npm run lint` and `npm test` after changes. Run `npm run build` before claiming the app is ready.

## Conventions

- All user-facing text is Arabic and RTL. Use the existing copy tone and Tailwind tokens (`brand`, `accent`, `warn`, `danger`, `ink`, `muted`, `panel`, `panel2`, `line`).
- Keep components in `components/`, business logic in `lib/`, and database access in `lib/db.ts`.
- API routes return `{ ok, ... }` via helpers in `lib/http.ts`; errors use `fail(message, status)`.
- Validate input with Zod schemas from `lib/validation.ts`.
- Cookie-authenticated mutations must call `checkOrigin(req)` first.
- Devices authenticate with `Authorization: Bearer <device token>`; never log or return raw tokens.
- Screen frames live only in memory (`lib/frames.ts`) with a 5-second TTL. Never persist frames to SQLite or disk.
- Add an audit entry for sensitive actions using `lib/audit.ts`.
- Do not add comments to code unless they explain non-obvious intent.

## Security invariants

- No hidden operation, background persistence, privilege bypass, message/file/contact access, camera/microphone capture, remote control, or APK generation.
- Screen sharing must be initiated on the device by an explicit user action, confirmed in the UI, and gated by the browser permission prompt.
- A share session expires after 10 minutes and can be stopped locally or by revoking the device.
- `SESSION_SECRET` must be set in production; it HMACs pairing and invite codes.
- Never commit `.env*` secrets or `data/*.db`.

## Git

Do not commit, push, or create branches unless the user explicitly asks. Inspect `git status` and `git diff` before any requested commit.
