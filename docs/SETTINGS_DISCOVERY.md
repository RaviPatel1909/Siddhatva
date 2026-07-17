# Settings — Discovery Audit (Phase 1)

Audit of what user-configurable behavior *actually exists* in Siddhatva today,
so the Settings phase exposes real capability instead of fabricating features.
Source of truth: the Prisma schema, the Express routes, `docs/API_CONTRACT.md`,
and the frontend contexts. Dated 2026-07-17.

---

## TL;DR

The pre-existing `src/pages/account/ProfileSettings.tsx` was a **static mock**:
hardcoded name ("Alexander Sterling"), `defaultValue` inputs, `onSubmit={e =>
e.preventDefault()}` forms that persist nothing, notification toggles held only in
`useState`, and a "Deactivate Account" button wired to no endpoint. **None of its
controls were backed by the server.**

The backend genuinely supports a *small* set of account actions. The Settings
phase wires exactly those, honestly, and documents the rest as future work — per
the sprint's own rule: *"Only expose functionality already supported. Do not
invent backend APIs."*

---

## What exists, by category

### Account identity — READ, no self-service edit

- `User` model fields: `id`, `email`, `name`, `password` (bcrypt), `role`
  (`CUSTOMER` | `ADMIN`), `createdAt`. **No** `phone`, **no** `avatar`/image,
  **no** preference columns.
- `GET /api/auth/me` returns `{ id, email, name, role }` (via `toPublicUser`) —
  `createdAt` is **not** surfaced.
- There is **no** `PATCH /me` / update-profile endpoint. Name and email cannot be
  changed by the user. The mock's editable Name/Email/Phone form had no backend.
- **Status: identity is displayable (real), not editable (missing).**

### Security / password

- Password **reset** flow is real end-to-end: `POST /auth/forgot-password`
  (enumeration-safe, rate-limited, emails a link) → `POST /auth/reset-password`
  (single-use token; **revokes every refresh token** so all sessions log out).
- There is **no** authenticated "change password with current password" endpoint.
  The mock's current/new/confirm form had no backend.
- **Status: password change via the reset-link flow is fully supported. In-place
  change-password is missing.**

### Sessions

- `POST /auth/logout` revokes the current device's refresh token and clears the
  cookie (real — used by `AuthContext.logout`).
- Refresh tokens are per-device rows; `reset-password` already does a
  revoke-all-sessions (`refreshToken.updateMany`). But there is **no** dedicated
  "log out all other sessions" endpoint, and **no** endpoint to list active
  sessions / recent logins.
- **Status: sign-out (this device) real. Session list + explicit logout-all
  missing** (the revoke-all mechanism exists but is only reachable via reset).

### Notifications

- Email is **transactional only**, fired off the order lifecycle event bus
  (`order.paid` → order confirmation, `order.shipped` → shipping notification),
  sent to `order.user.email` unconditionally (`lib/email/subscribers.ts`).
- There is **no** per-user notification-preference storage, **no** marketing /
  promotional email system, and **no** SMS channel. The mock's Email / SMS /
  Promotions toggles were pure `useState` — persisted nowhere and honored by
  nothing.
- **Status: a real (but non-configurable) transactional email stream exists.
  Preference toggles are missing** — building them would need a schema column +
  a subscribers.ts opt-out check (documented, not built).

### Preferences

- **Theme:** single fixed brand theme (cream/bronze) in `tailwind.config.js` +
  `src/index.css`. No dark mode. → not applicable.
- **Currency / language / timezone:** INR + `en` only, no i18n layer. → not
  applicable.
- **Motion / accessibility:** `src/index.css` **already** ships a complete
  `@media (prefers-reduced-motion: reduce)` rule set (kills `.page-enter`,
  `.fade-in-up`, confetti, and `.fade-in-section` reveals). This is the one piece
  of genuinely *existing configurable behavior* — currently driven only by the OS
  setting, with no in-app override.
- **Default sort / grid view:** `ShopAll` holds `sort` in ephemeral `useState`
  (resets every visit); not persisted.
- **Status: reduce-motion behavior EXISTS and can be exposed as an in-app
  preference with zero backend. Everything else is not applicable to this
  product.**

### Addresses

- `Address` model has an optional `user` relation, but addresses are only ever
  created **inline at checkout** and linked to the order. There is **no**
  address-book CRUD route and no UI to manage saved addresses.
- **Status: missing** (would be a net-new backend concept — out of scope).

### Admin configuration

- Admin already has real configurable surfaces: Home content editor
  (`/admin/home` → `SiteContent`), product management, order management,
  analytics. These are full pages, not "settings."
- Environment-driven config (Cloudinary/Razorpay/Resend/Shiprocket via the
  interface-seam pattern) is **operator** configuration (env vars), deliberately
  **not** user-facing, and must stay server-side (secrets rule).
- **Status: admin config exists as first-class pages; nothing orphaned that needs
  a new "admin settings" home. Not redesigning admin (per Phase 7 guardrail).**

---

## Decision matrix

| Capability                     | Backend today            | This sprint                         |
| ------------------------------ | ------------------------ | ----------------------------------- |
| View name / email / role       | `GET /auth/me` ✅         | **Expose** (read-only account card) |
| Edit name / email              | none ❌                   | Document as future                  |
| Phone number                   | no column ❌              | Document as future                  |
| Profile image / avatar         | no column ❌              | Initials avatar from name; future   |
| Change password (reset link)   | forgot/reset flow ✅      | **Expose** (send reset link)        |
| Change password (in-place)     | none ❌                   | Document as future                  |
| Sign out (this device)         | `POST /auth/logout` ✅    | **Expose**                          |
| List sessions / recent login   | none ❌                   | Document as future                  |
| Log out all sessions           | via reset only ⚠️        | Document as future                  |
| Two-factor auth                | none ❌                   | Document as future                  |
| Notification preferences       | none (transactional) ❌  | **Expose read-only info**; future   |
| Reduce motion                  | CSS media query ✅        | **Expose** (in-app override)        |
| Theme / language / currency    | single-value ❌          | Not applicable                      |
| Saved addresses                | none ❌                   | Document as future                  |
| Delete / deactivate account    | none ❌                   | Document as future (remove fake)    |

Legend: ✅ real · ⚠️ partial · ❌ missing.

---

## What the Settings phase will ship

A rebuilt, honest **Settings** page (replacing the mock at `/account/profile`),
grouped as: **Account** (real identity + sign out), **Security** (send password
reset link, with accurate copy about all-sessions logout), **Notifications**
(read-only description of the real transactional email stream), **Preferences**
(Reduce motion — real, no backend), **Privacy** (link to the existing Privacy
Policy). No new backend endpoints, no schema changes, no fabricated toggles.
