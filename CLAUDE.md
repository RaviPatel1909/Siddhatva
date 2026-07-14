# CLAUDE.md — How to work in this repo

Standing rules for every session. This is the **rulebook (how to work)**;
`Siddhatva - context/context.md` is the **project state (what exists)**. Read both
before acting. When the two disagree, this file wins on process; context.md wins on
current facts.

---

## Stack constraints — do not cross these lines

- **Frontend is a React + Vite SPA.** Never suggest or introduce Next.js — no server
  components, no route handlers, no `next/*` imports, no app/pages router, no RSC.
  Client-side routing is React Router 7. Server state is TanStack Query 5.
- **Backend is Express + Prisma + Postgres + Zod + TypeScript in `/server`.** Not Hono,
  not Fastify, not serverless/edge functions, not a different ORM. CommonJS +
  `nodenext`. Validate all input with Zod.
- Don't add a framework, meta-framework, or runtime to dodge a problem the existing
  stack can already solve. Reach for a new dependency only when the stack genuinely
  can't do it, and say why.

## The interface-seam pattern — every external integration follows it

Every third-party service sits behind **one interface with two implementations: the
real service and a dev fallback**, selected by env-var presence. Existing examples:
`ImageStore` (Cloudinary / local files), `PaymentGateway` (Razorpay / mock),
`embedded-postgres` (local Postgres / any managed Postgres via `DATABASE_URL`).

New integrations (Resend, Shiprocket, WhatsApp, GA4, …) **must** follow this:

1. Define the interface first; write the app against the interface only.
2. Ship a working **dev fallback** (mock/local/no-op-that-logs) so the app runs with
   no credentials.
3. Ship the real adapter **code-complete now**, activated purely by setting the
   documented env vars — **zero code change to go live**.
4. Prefer subscribing to the order lifecycle event bus (`server/src/lib/events.ts`)
   over scattering side-effects at call sites.

## Contract rule

`docs/API_CONTRACT.md` is the **single source of truth** for the HTTP API. The typed
`src/api/*` client, the MSW handlers (`src/mocks/*`), and the Express server all
implement the same shapes.

- On any **mock ↔ real mismatch, fix the backend to match the contract.** Never patch
  the frontend or the mocks to paper over a backend divergence.
- Changing a shape means updating the contract **first**, then the three
  implementations to match it.

## Design system — no raw hex, no new colors

Encoded in `tailwind.config.js` + `src/index.css`. Use the tokens, never raw values:

- Primary: bronze `#b87b5a` → `primary`. Background: cream `#fff9ed` → `background`.
- Semantic Material-style tokens: `surface`, `on-surface`, `outline-variant`, status
  colors. Typeface **Geist**; icons **Material Symbols**.
- **Reuse shared primitives** — `Button`, `Badge`, `Pagination`, `ImageUploader`, etc.
  Match the surrounding component's idiom.
- **No raw hex in components. No new colors** without a deliberate token addition.

## Git

- **Atomic conventional commits** (`feat(...)`, `fix(...)`, `docs(...)`, `test(...)`).
- **No squash.** **Branch-per-phase**, merged forward.
- Bugs found during verification get their own `fix(...)` commit.
- End every commit body with the `Co-Authored-By` trailer.
- Do not push unless explicitly asked. Remote `origin`
  (`github.com/RaviPatel1909/Siddhatva`) is configured and **CI runs on every push
  to `main`** (`.github/workflows/ci.yml`).

## Dependencies & lockfiles — regenerate, commit, verify with `npm ci`

Both packages carry their own lockfile (`package-lock.json` at the root and in
`/server`). CI installs with **`npm ci`**, which builds strictly from the lockfile
and **fails the whole run** on any drift between a `package.json` and its lockfile.

- **Any dependency change** (add, remove, or bump anything in either `package.json`)
  **must regenerate and commit that package's lockfile in the same change.** A
  dependency edit without its lockfile update is an incomplete commit.
- **Verify with `npm ci`, never `npm install`, before pushing.** `npm install` is
  lenient — it silently reconciles drift locally, masking exactly the desync that
  `npm ci` (and therefore CI) rejects with `EUSAGE … not in sync`. From a clean
  state, run `npm ci` in whichever package you touched (root and/or `/server`) and
  confirm it exits 0. This is the check that actually matters.
- Precedent: the `@types/node` ERESOLVE break (`a77b35f`) passed `npm install`
  locally and only surfaced under CI's `npm ci`. Don't relearn it.

## Verification — required after any change

Not optional. After a change, before considering it done:

1. **Typecheck + build pass on BOTH `/server` and the frontend.**
2. **Playwright at 375 and 1280** for any user-facing flow you touched.
3. **Re-verify the full purchase flow at both widths each phase.**
4. **Keep all 14 standing e2e specs green** (`e2e/` — auth-isolation, admin-access,
   home-content, payments, shipping, password-reset). Run with the stack up + DB
   seeded: `npm run test:e2e`.

## Test discipline

A regression test you can't see fail is not a regression test. **Before trusting a new
test, prove it fails with the bug present** (reintroduce the bug or assert against the
broken state), then confirm the fix turns it green. Every bug fix ships with a test
that guards its class of failure.

## Secrets

- API/key secrets, key-secret, webhook secret, DB URL, JWT secret — **server-side
  only.** Never ship them to the browser or commit them.
- The **only** values allowed to reach the client are the **Cloudinary cloud name**
  and the **Razorpay `key_id`**.
