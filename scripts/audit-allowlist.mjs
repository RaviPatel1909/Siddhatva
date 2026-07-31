#!/usr/bin/env node
// Dependency audit gate with a narrow, dated allowlist.
//
// WHY THIS EXISTS: CI ran `npm audit --omit=dev --audit-level=high` directly, which
// is all-or-nothing — npm audit has no per-advisory ignore. When an advisory lands
// that is genuinely not reachable in this app, the only options npm gives are to
// leave the gate red forever or to weaken it for everything. This script keeps the
// gate at full strength (any high/critical advisory fails the build) while allowing
// specific, justified, EXPIRING exceptions.
//
// Deliberately dependency-free (plain node, no audit-ci) — same reasoning as the
// hand-rolled security headers: avoid a devDependency and its cross-platform
// lockfile churn for something this small. See CLAUDE.md.
//
// Usage:  node scripts/audit-allowlist.mjs [packageDir]   (default ".")

import { spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// The allowlist. Add an entry ONLY with: a concrete reachability argument, and a
// reviewBy date. An entry past its reviewBy date FAILS the build on purpose —
// that is what makes the exception time-boxed rather than permanent.
// ---------------------------------------------------------------------------
const ALLOWLIST = [
  {
    id: 'GHSA-qwww-vcr4-c8h2',
    package: 'react-router',
    reviewBy: '2026-10-31',
    reason:
      'RSC-mode CSRF bypass (server actions executing before a 400). NOT REACHABLE here: ' +
      'this is a client-only Vite SPA using the declarative router exclusively — ' +
      'BrowserRouter/Routes/Route/Link/NavLink/Navigate/Outlet + the use* hooks. ' +
      'src/ contains no createStaticHandler, createStaticRouter, RouterProvider, ' +
      'createBrowserRouter, @react-router/*, ServerRouter or any RSC/SSR entry point, ' +
      'and CLAUDE.md bans RSC outright. ' +
      'NO FIX AVAILABLE ON v7: the advisory range is >=7.12.0 <8.3.0 (one continuous ' +
      'range across both majors), first patched in 8.3.0, and react-router-dom has no ' +
      '8.x release at all (latest 7.18.2, which hard-pins react-router 7.18.2). ' +
      'Upgrading therefore means dropping react-router-dom and migrating every import ' +
      'to react-router v8 — a major migration, not a bump. npm\'s own suggested fix is a ' +
      'DOWNGRADE to react-router-dom@7.11.0 (isSemVerMajor). ' +
      'REVIEW TRIGGER: re-evaluate at the date above, or sooner if routing is reworked ' +
      'or a v8 migration is planned.',
  },
];

const BLOCKING = new Set(['high', 'critical']);

const packageDir = process.argv[2] ?? '.';
const label = packageDir === '.' ? 'frontend' : packageDir;

// `npm audit` exits non-zero when it finds anything, so capture output regardless
// and decide ourselves. --audit-level is intentionally omitted: we filter by
// severity here so the JSON always contains the full picture.
const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd: packageDir,
  encoding: 'utf8',
  shell: true,
  maxBuffer: 32 * 1024 * 1024,
});

if (!result.stdout) {
  console.error(`[audit] no output from npm audit in "${label}" — failing closed.`);
  console.error(result.stderr ?? '(no stderr)');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error(`[audit] could not parse npm audit JSON in "${label}" — failing closed.`);
  console.error(result.stdout.slice(0, 2000));
  process.exit(1);
}

// npm's audit error shape (e.g. registry unreachable) — fail closed rather than
// reporting a clean scan we never actually performed.
if (report.error) {
  console.error(`[audit] npm audit errored in "${label}" — failing closed.`);
  console.error(JSON.stringify(report.error, null, 2));
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const allowById = new Map(ALLOWLIST.map((e) => [e.id, e]));

const blocking = [];
const suppressed = [];
const seenAllowed = new Set();

for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  if (!BLOCKING.has(vuln.severity)) continue;

  // A package entry can carry several advisories; `via` holds the real ones as
  // objects (strings are just parent packages pulling the vulnerable dep in).
  const advisories = (vuln.via ?? []).filter((v) => typeof v === 'object');
  if (advisories.length === 0) continue; // transitive-only; the source entry covers it

  for (const adv of advisories) {
    const ghsa = String(adv.url ?? '').split('/').pop() ?? '(unknown)';
    const entry = allowById.get(ghsa);
    if (entry) {
      seenAllowed.add(ghsa);
      suppressed.push({ ghsa, name, entry, title: adv.title, severity: adv.severity });
    } else {
      blocking.push({ ghsa, name, title: adv.title, severity: adv.severity, url: adv.url });
    }
  }
}

console.log(`[audit] ${label}: production dependency scan`);

for (const s of suppressed) {
  const expired = s.entry.reviewBy < today;
  console.log(
    `  ${expired ? 'EXPIRED ' : 'allowed '} ${s.ghsa} (${s.severity}) ${s.name} — review by ${s.entry.reviewBy}`
  );
  console.log(`      ${s.title ?? ''}`);
  if (expired) {
    console.error(
      `\n[audit] FAIL: allowlist entry ${s.ghsa} expired on ${s.entry.reviewBy} (today ${today}).\n` +
        `        The exception was time-boxed on purpose. Re-assess it now: either\n` +
        `        upgrade past the advisory, or renew the entry in scripts/audit-allowlist.mjs\n` +
        `        with a fresh reachability argument and a new reviewBy date.`
    );
  }
}

// An allowlist entry that no longer matches anything is dead weight — surface it so
// the list doesn't rot. Informational only: the entry may apply to another package.
for (const entry of ALLOWLIST) {
  if (!seenAllowed.has(entry.id)) {
    console.log(`  note     ${entry.id} not present in ${label} — remove the entry if it is fixed everywhere.`);
  }
}

if (blocking.length > 0) {
  console.error(`\n[audit] FAIL: ${blocking.length} high/critical advisory(ies) in "${label}" with no allowlist entry:\n`);
  for (const b of blocking) {
    console.error(`  - ${b.ghsa} (${b.severity}) ${b.name}: ${b.title ?? ''}`);
    console.error(`    ${b.url ?? ''}`);
  }
  console.error(
    `\n  Fix it, or — only if it is genuinely unreachable — add a dated entry to\n` +
      `  scripts/audit-allowlist.mjs with the reachability argument written out.`
  );
  process.exit(1);
}

if (suppressed.some((s) => s.entry.reviewBy < today)) process.exit(1);

const counts = report.metadata?.vulnerabilities ?? {};
console.log(
  `  no blocking advisories (high ${counts.high ?? 0}, critical ${counts.critical ?? 0}; ` +
    `${suppressed.length} allowlisted)`
);
