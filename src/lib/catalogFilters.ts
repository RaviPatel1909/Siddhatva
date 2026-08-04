// URL state for the storefront catalog filters, shared by Shop All and Search
// Results so a filtered view is shareable and the back button works — the same
// discipline as src/lib/analyticsFilters.ts.
//
// The URL is the single source of truth: no page holds filter state in useState,
// so a link pasted into a new tab reproduces the exact grid. Category is
// deliberately NOT here — on /shop it is the route (/shop/:category) and on
// /search it is an on-page refinement; each page owns it.

export interface CatalogFilters {
  color: string | null;
  size: string | null;
  /** Inclusive lower bound in whole rupees. */
  minPrice: number | null;
  /** Inclusive upper bound in whole rupees. null = no upper bound. */
  maxPrice: number | null;
}

export const EMPTY_FILTERS: CatalogFilters = {
  color: null,
  size: null,
  minPrice: null,
  maxPrice: null,
};

// Whole-rupee integers only, matching the server's Zod schema — a junk or
// fractional value in a hand-edited URL is dropped rather than sent on to be
// rejected with a 400.
function parsePrice(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function parseFilters(params: URLSearchParams): CatalogFilters {
  return {
    color: params.get('color') || null,
    size: params.get('size') || null,
    minPrice: parsePrice(params.get('minPrice')),
    maxPrice: parsePrice(params.get('maxPrice')),
  };
}

// A price range counts as ONE active filter however many bounds it has — the
// badge should read "Filter (2)" for "blue, under ₹3,000", not (3).
export function activeFilterCount(filters: CatalogFilters): number {
  let n = 0;
  if (filters.color) n += 1;
  if (filters.size) n += 1;
  if (filters.minPrice !== null || filters.maxPrice !== null) n += 1;
  return n;
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return activeFilterCount(filters) > 0;
}

// Write filters onto a copy of the current params. Any filter change resets
// `page` — leaving a stale page=3 behind is how a filter click lands the shopper
// on an empty grid with no explanation.
export function writeFilters(params: URLSearchParams, filters: CatalogFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
  };
  set('color', filters.color);
  set('size', filters.size);
  set('minPrice', filters.minPrice === null ? null : String(filters.minPrice));
  set('maxPrice', filters.maxPrice === null ? null : String(filters.maxPrice));
  next.delete('page');
  return next;
}
