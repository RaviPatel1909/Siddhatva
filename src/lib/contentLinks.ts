// Validation for admin-authored home content.
//
// Exists because a real production incident: the hero's primary CTA was saved as
// "/Shop " — capital S and a trailing space. Routes are lower-case and
// case-sensitive, and there is no `<Route path="*">` catch-all, so the storefront's
// main call-to-action navigated to a completely blank page (not even a 404, since
// layout lives inside each page component). Two invisible characters took out the
// primary conversion path, and nothing caught it at save time.
//
// So: trim every string on save, and refuse to save an internal link that does not
// match a real route.

// The public storefront routes an editor may legitimately link to, mirroring
// src/App.tsx. Admin, account and transient checkout routes are deliberately
// excluded — they're gated or single-use, so linking them from home content is
// always a mistake.
export const LINKABLE_ROUTES = [
  '/',
  '/shop',
  '/shop/:category',
  '/search',
  '/product/:id',
  '/cart',
  '/login',
  '/register',
  '/contact',
  '/shipping-policy',
  '/pricing-policy',
  '/refund-policy',
  '/terms',
  '/privacy',
] as const;

// "#" is the established convention for "this button goes nowhere yet" — Home's
// `go()` already no-ops on it, so it stays valid.
const NO_LINK = '#';

const toPattern = (route: string): RegExp =>
  new RegExp(`^${route.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/')}$`);

const PATTERNS = LINKABLE_ROUTES.map(toPattern);

const isExternal = (href: string): boolean => /^https?:\/\//i.test(href);

export function isLinkableRoute(href: string): boolean {
  return PATTERNS.some((re) => re.test(href));
}

export interface HrefProblem {
  /** Human-readable reason, shown next to the offending field. */
  message: string;
  /** A corrected value when one can be inferred (casing/slash slips). */
  suggestion?: string;
}

// Returns null when the href is fine. Assumes an already-trimmed value — trimming
// is a separate, always-applied step (see trimHomeContent).
export function validateHref(href: string): HrefProblem | null {
  if (href === '' || href === NO_LINK) return null;
  if (isExternal(href)) return null; // off-site links can't be checked here

  if (!href.startsWith('/')) {
    const candidate = `/${href}`;
    return {
      message: 'Internal links must start with "/".',
      suggestion: isLinkableRoute(candidate) ? candidate : undefined,
    };
  }

  if (isLinkableRoute(href)) return null;

  // The common slips are casing and a stray trailing slash — both are recoverable,
  // so offer the fix rather than just rejecting.
  const lowered = href.toLowerCase();
  const deslashed = lowered.length > 1 ? lowered.replace(/\/+$/, '') : lowered;
  const suggestion = [lowered, deslashed].find(
    (candidate) => candidate !== href && isLinkableRoute(candidate)
  );

  return {
    message: `"${href}" is not a route on this site, so this link would open a blank page.`,
    suggestion,
  };
}

// Deep-trims every string in the content tree. Whitespace in a headline is
// cosmetic; whitespace in an href is a dead link — trimming both on save is the
// cheap half of the fix.
export function trimHomeContent<T>(content: T): T {
  if (typeof content === 'string') return content.trim() as unknown as T;
  if (Array.isArray(content)) return content.map((item) => trimHomeContent(item)) as unknown as T;
  if (content && typeof content === 'object') {
    return Object.fromEntries(
      Object.entries(content as Record<string, unknown>).map(([key, value]) => [
        key,
        trimHomeContent(value),
      ])
    ) as T;
  }
  return content;
}
