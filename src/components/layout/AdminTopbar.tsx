import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { searchAdmin } from '../../api/admin';
import { queryKeys } from '../../api/queryKeys';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// Minimum query length before the search hits the backend (mirrors the server's
// 2-char floor). Debounce keeps typing from firing a request per keystroke.
const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 250;

// Small local debounce — no shared hook exists and this is the only caller.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// One flattened, navigable result row. `to` is the management page a click lands
// on (see the group builder below for why each kind routes where it does).
interface ResultRow {
  key: string;
  to: string;
  primary: string;
  secondary: string;
}

// Admin topbar search combobox. Grouped typeahead across products / orders /
// customers, backed by GET /admin/search. Desktop-only (hidden lg:block) — the
// admin panel is not designed for mobile widths.
const AdminSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, SEARCH_DEBOUNCE_MS);
  const enabled = debounced.length >= SEARCH_MIN_CHARS;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.adminSearch(debounced),
    queryFn: () => searchAdmin(debounced),
    enabled,
  });

  // Panel shows once the user has typed ≥2 chars and hasn't dismissed it.
  const panelOpen = open && trimmed.length >= SEARCH_MIN_CHARS;
  // Loading while the request is in flight, or while the input has run ahead of
  // the debounce (≥2 chars typed but the query hasn't caught up yet).
  const loading = enabled ? isFetching || debounced !== trimmed : trimmed.length >= SEARCH_MIN_CHARS;

  const results = data ?? { products: [], orders: [], customers: [] };
  const groups = [
    {
      label: 'Products',
      rows: results.products.map<ResultRow>((p) => ({
        key: `product-${p.id}`,
        // No per-product deep link — ProductManagement selects via internal state.
        to: '/admin/products',
        primary: p.name,
        secondary: p.sublabel,
      })),
    },
    {
      label: 'Orders',
      rows: results.orders.map<ResultRow>((o) => ({
        key: `order-${o.id}`,
        // OrderManagement opens its drawer from internal state, so we land on the list.
        to: '/admin/orders',
        primary: o.label,
        secondary: o.sublabel,
      })),
    },
    {
      label: 'Customers',
      rows: results.customers.map<ResultRow>((c) => ({
        key: `customer-${c.id}`,
        // No customer detail view exists — deep-link to the order list pre-filtered
        // to this customer. Filter by name (the only customer field the order
        // carries); OrderManagement reads ?q= into its existing search filter.
        to: `/admin/orders?q=${encodeURIComponent(c.name)}`,
        primary: c.name,
        secondary: c.email,
      })),
    },
  ];
  const flat = groups.flatMap((g) => g.rows);
  const hasHits = flat.length > 0;

  // Reset the keyboard cursor whenever the underlying result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  // Close on click outside the combobox.
  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [panelOpen]);

  const go = (to: string) => {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    navigate(to);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!panelOpen || !hasHits) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = flat[activeIndex];
      if (target) go(target.to);
    }
  };

  // Running offset so each row's global index (for highlight + aria) lines up
  // with the flattened list the keyboard navigates.
  let renderIndex = 0;

  return (
    <div ref={containerRef} className="relative w-96 hidden lg:block">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
        search
      </span>
      <input
        role="combobox"
        aria-expanded={panelOpen}
        aria-controls="admin-search-listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `admin-search-option-${activeIndex}` : undefined}
        className="w-full bg-surface-container-lowest border-none rounded-full pl-10 pr-4 py-2 focus:ring-1 focus:ring-primary text-body-md placeholder:text-outline-variant transition-all"
        placeholder="Search management..."
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {panelOpen && (
        <div
          id="admin-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto bg-surface border border-outline-variant rounded-xl shadow-bronze z-50 py-xs"
        >
          {loading ? (
            <div className="px-sm py-xs space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : !hasHits ? (
            <EmptyState icon="search_off" title="No matches" />
          ) : (
            groups.map((group) => {
              if (group.rows.length === 0) return null;
              return (
                <div key={group.label} role="group" aria-label={group.label}>
                  <p className="px-sm pt-sm pb-1 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
                    {group.label}
                  </p>
                  {group.rows.map((row) => {
                    const index = renderIndex++;
                    const active = index === activeIndex;
                    return (
                      <button
                        key={row.key}
                        id={`admin-search-option-${index}`}
                        role="option"
                        aria-selected={active}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        // mousedown (not click) so navigation fires before the input blurs.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          go(row.to);
                        }}
                        className={`w-full flex flex-col items-start px-sm py-2 text-left transition-colors ${
                          active ? 'bg-primary-container' : 'hover:bg-surface-container-lowest'
                        }`}
                      >
                        <span className="w-full truncate text-body-md text-on-surface">{row.primary}</span>
                        <span className="w-full truncate text-label-sm text-on-surface-variant">
                          {row.secondary}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const AdminTopbar: React.FC = () => {
  const { user } = useAuth();
  const name = user?.name ?? '';

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-256px)] h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant flex justify-between items-center px-lg z-40">
      <AdminSearch />
      <div className="flex items-center gap-md">
        <Link to="/" className="text-primary font-bold font-label-sm text-label-sm hover:opacity-80 transition-opacity">
          View Site
        </Link>
        <div className="flex items-center gap-xs ml-sm">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center overflow-hidden border border-outline-variant text-on-secondary-fixed font-bold text-sm">
            {initials(name)}
          </div>
          <div className="hidden lg:block">
            <p className="font-label-sm text-label-sm text-on-surface">{name}</p>
            <p className="text-[10px] text-outline uppercase tracking-tighter">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
