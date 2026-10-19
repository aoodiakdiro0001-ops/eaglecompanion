# Eagle Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Execution note:** Global project rules prohibit commits unless the user explicitly requests them. All commit steps below are therefore deferred; do not run them without user approval.

**Goal:** Build a consent-first device companion: a Next.js dashboard plus a PWA agent that reports device status and shares the screen only on explicit user action.

**Architecture:** Single Next.js 15 App Router application (TypeScript) serving RTL Arabic UI and REST route handlers. SQLite via `better-sqlite3` holds users, workspaces, devices, sessions, invites, share sessions, and audit logs. Screen frames live only in an in-memory TTL map. Agent endpoints authenticate with a random device bearer token; dashboard endpoints use an HttpOnly session cookie.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3.4, better-sqlite3, zod, Vitest, Node `crypto` (scrypt), PWA manifest + service worker.

## Global Constraints

- Arabic RTL UI, dark theme, responsive.
- No stealth, no background hidden operation, no SMS/calls/contacts/files, no camera/mic, no remote control, no APK generation.
- Screen frames are never written to disk or SQLite; TTL 5 seconds.
- Share sessions expire after 10 minutes; agent shows a persistent red banner and stop button.
- Passwords hashed with `scrypt`; session/device codes stored only as SHA-256 hashes.
- Every cookie-authenticated mutation checks the `Origin` header.
- Rate limit login, pairing, and frame upload endpoints.
- No secrets committed; `.env.example` only.
- `npm run build` and `npm test` must pass before completion.

---

### Task 1: Scaffold and design tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `.env.example`, `.gitignore` additions, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/brand.tsx`, `components/icons.tsx`

**Interfaces:**
- Produces: Tailwind theme tokens (`bg`, `panel`, `line`, `ink`, `muted`, `brand`, `accent`, `danger`), `Brand` component, icon components.
- Produces: root layout with `<html lang="ar" dir="rtl">` and metadata for the PWA.

- [ ] Write `package.json` with scripts `dev`, `build`, `start`, `lint`, `test`, `test:run`.
- [ ] Add Tailwind/PostCSS/Next config including `allowedDevOrigins: ['.monkeycode-ai.live']` and `serverExternalPackages: ['better-sqlite3']`.
- [ ] Create the dark navy/cyan design tokens and base styles.
- [ ] Create the Arabic landing page explaining consent-first behavior and the explicit exclusions.
- [ ] Run `npm install` and `npm run build`; expected: build succeeds.

### Task 2: Database and schema

**Files:**
- Create: `lib/db.ts`, `lib/ids.ts`, `types/index.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces: `getDb(): Database`, `now(): number`, `newId(prefix: string): string`.
- Produces tables: `users`, `sessions`, `workspaces`, `workspace_members`, `devices`, `pairing_codes`, `invite_codes`, `share_sessions`, `audit_logs`.
- `getDb()` is idempotent, creates `data/` if needed, enables WAL and foreign keys.

- [ ] Write schema DDL with the columns from the spec, `IF NOT EXISTS`, and indexes on `devices.workspace_id`, `audit_logs.workspace_id`, `sessions.token_hash`.
- [ ] Write `tests/db.test.ts` asserting tables exist and `DATABASE_PATH=:memory:` works.
- [ ] Run `npm test -- tests/db.test.ts`; expected: pass.

### Task 3: Crypto, tokens, rate limiting

**Files:**
- Create: `lib/crypto.ts`, `lib/tokens.ts`, `lib/rate-limit.ts`
- Test: `tests/crypto.test.ts`, `tests/tokens.test.ts`, `tests/rate-limit.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain): Promise<string>`, `verifyPassword(plain, stored): Promise<boolean>`.
- Produces: `randomToken(bytes = 32): string`, `sha256(value): string`, `newPairingCode(): string` (format `ABCD-EFGH`), `normalizeCode(input): string`.
- Produces: `rateLimit(key, limit, windowMs, nowMs?): { allowed: boolean; retryAfterMs: number }` and `resetRateLimits()`.

- [ ] Tests for password round-trip and rejection, token length, code format/normalization, and sliding-window blocking.
- [ ] Implement with `crypto.scrypt`, `timingSafeEqual`, `randomBytes`, and an in-memory Map.
- [ ] Run tests; expected: pass.

### Task 4: Sessions and auth APIs

**Files:**
- Create: `lib/auth.ts`, `lib/http.ts`, `lib/validation.ts`, `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `middleware.ts`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Produces: `SESSION_COOKIE = 'eagle_session'`, `createSession(userId): string`, `getSessionUser(): Promise<User | null>`, `destroySession(): Promise<void>`.
- Produces: `requireUser(): Promise<User>`, `requireWorkspace(userId, workspaceId)`, `json(data, status?)`, `fail(message, status)`, `checkOrigin(req): boolean`, `clientIp(req): string`.
- Produces: zod schemas `registerSchema`, `loginSchema`.
- Registration creates a personal workspace and owner membership.

- [ ] Tests: register creates user/workspace/session; duplicate email rejected; login rate limit blocks after 8 failures; origin check rejects cross-origin.
- [ ] Implement password auth with cookie `HttpOnly`, `SameSite=Lax`, 30-day expiry.
- [ ] Protect `/app/*` in middleware by cookie presence; full authorization remains server-side.
- [ ] Run tests; expected: pass.

### Task 5: Workspaces, members, invites, audit

**Files:**
- Create: `lib/workspaces.ts`, `lib/audit.ts`, `app/api/workspaces/route.ts`, `app/api/workspaces/[id]/route.ts`, `app/api/workspaces/[id]/invites/route.ts`, `app/api/workspaces/join/route.ts`, `app/api/audit/route.ts`
- Test: `tests/workspaces.test.ts`

**Interfaces:**
- Produces: `listWorkspaces(userId)`, `createWorkspace(userId, name)`, `getMembership(userId, workspaceId)`, `assertRole(userId, workspaceId, roles)`.
- Produces: `createInvite(workspaceId, userId, role)`, `joinWorkspace(userId, code)`, `audit(workspaceId, action, opts)`.
- Roles: `owner | member | viewer`. Only owners manage invites/devices; viewers read-only.

- [ ] Tests: personal workspace on register, invite join, viewer cannot create invite, audit row written.
- [ ] Implement routes and audit events: `workspace.create`, `member.join`, `invite.create`.
- [ ] Run tests; expected: pass.

### Task 6: Devices, pairing, heartbeat

**Files:**
- Create: `lib/devices.ts`, `app/api/devices/route.ts`, `app/api/devices/pairing-code/route.ts`, `app/api/devices/[id]/route.ts`, `app/api/agent/pair/route.ts`, `app/api/agent/heartbeat/route.ts`
- Test: `tests/devices.test.ts`

**Interfaces:**
- Produces: `createPairingCode(workspaceId, userId)`, `consumePairingCode(code, deviceInfo)`, `listDevices(workspaceId)`, `getDeviceForUser(userId, deviceId)`, `revokeDevice(userId, deviceId)`, `deviceByToken(token)`, `touchDevice(deviceId, patch)`.
- Device status computed: `online` when `last_seen_at > now - 45_000` and not revoked.
- Pairing codes: 8 chars, 10-minute expiry, single use, stored as SHA-256 hash.

- [ ] Tests: pairing consumes code once, device token works, heartbeat updates, revoke blocks `deviceByToken`, viewer cannot revoke.
- [ ] Implement routes with workspace/role checks and audit events.
- [ ] Run tests; expected: pass.

### Task 7: Share sessions and transient frames

**Files:**
- Create: `lib/frames.ts`, `lib/share.ts`, `app/api/agent/share/start/route.ts`, `app/api/agent/share/stop/route.ts`, `app/api/agent/frames/route.ts`, `app/api/devices/[id]/frame/route.ts`, `app/api/devices/[id]/share/route.ts`
- Test: `tests/frames.test.ts`, `tests/share.test.ts`

**Interfaces:**
- Produces: `setFrame(deviceId, shareId, bytes, nowMs?)`, `getFrame(deviceId, nowMs?): { bytes: Buffer; mime: string; updatedAt: number } | null`, `clearFrame(deviceId)`, `FRAME_TTL_MS = 5000`.
- Produces: `startShare(device)`, `stopShare(deviceId)`, `activeShare(deviceId)`.
- Frame upload validates base64 JPEG, max 400 KB, requires active share.

- [ ] Tests: frame TTL expiry, clearing, share expiry at 10 minutes, frame rejected without active share.
- [ ] Implement in-memory map plus DB share sessions.
- [ ] Run tests; expected: pass.

### Task 8: Dashboard UI

**Files:**
- Create: `app/app/layout.tsx`, `app/app/page.tsx`, `app/app/devices/[id]/page.tsx`, `app/app/audit/page.tsx`, `app/app/members/page.tsx`, `app/app/settings/page.tsx`, `components/app-shell.tsx`, `components/stat-card.tsx`, `components/status-badge.tsx`, `components/pair-device-dialog.tsx`, `components/live-viewer.tsx`, `components/empty-state.tsx`
- Test: `tests/ui-contract.test.ts` (string-level route/contract checks)

**Interfaces:**
- Dashboard server component loads user, workspaces, active workspace, devices, stats.
- `LiveViewer` polls `/api/devices/[id]/frame` every 1s and shows start/stop state from `/api/devices/[id]/share`.
- Pair dialog requests `/api/devices/pairing-code` and displays the code with copy button.
- Device page offers revoke and shows audit events.

- [ ] Implement RTL responsive shell with sidebar/topbar and workspace switcher.
- [ ] Implement stats, device grid, empty states, and pairing dialog.
- [ ] Implement live viewer with no-store image fetch and graceful unsupported/empty states.
- [ ] Implement members, audit timeline, and settings pages.
- [ ] Run `npm run build`; expected: pass.

### Task 9: Agent PWA and screen sharing

**Files:**
- Create: `app/pair/page.tsx`, `app/agent/page.tsx`, `components/agent-pair-form.tsx`, `components/agent-console.tsx`, `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`, `components/pwa-register.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- `POST /api/agent/pair` returns `{ deviceId, token, device }` exactly once.
- Token stored in `localStorage` under `eagle_device_token`; device metadata under `eagle_device_info`.
- Heartbeat every 15s; share start -> `getDisplayMedia` -> canvas JPEG at 1 fps max width 960 -> frames; stop clears.
- Unsupported browsers show an explicit message; no fallback capture.

- [ ] Implement pairing form and agent console with live status.
- [ ] Implement share flow with confirmation, red banner, stop button, auto-stop timer.
- [ ] Add manifest, icons, service worker caching only static shell, and registration.
- [ ] Verify in browser: pair, heartbeat, share, stop.

### Task 10: Final verification and docs

**Files:**
- Create: `README.md`, `AGENTS.md`
- Modify: `.env.example`

**Interfaces:**
- README: setup, env, scripts, security model, explicit non-goals, preview instructions.
- AGENTS.md: commands `npm run dev`, `npm test`, `npm run build`.

- [ ] Run `npm test`; expected: all pass.
- [ ] Run `npm run build`; expected: success.
- [ ] Start dev server, pair a browser as a device, verify heartbeat and audit.
- [ ] Verify screen share on a supporting browser and that the frame disappears after stop.
- [ ] Deploy preview and report the URL.

## Self-Review Checklist

- Spec sections 4–10 each map to Tasks 1–9.
- No hidden or background features are implemented.
- All tokens/codes hashed; frames transient.
- Types used across tasks: `User`, `Workspace`, `Device`, `ShareSession`, `Membership` defined in `types/index.ts` in Task 2.
- `requireUser` used by dashboard routes; `deviceByToken` used by agent routes.
