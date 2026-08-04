import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { formatPrice } from '../../lib/money';
import { CatalogFilters, activeFilterCount } from '../../lib/catalogFilters';
import { ColorFacet, PriceFacet, SizeFacet } from '../../api/types';

interface FilterPanelProps {
  colors: ColorFacet[];
  sizes: SizeFacet[];
  price: PriceFacet | undefined;
  filters: CatalogFilters;
  onChange: (next: Partial<CatalogFilters>) => void;
  onClearAll: () => void;
  isLoading: boolean;
  /** Result count for the current filters, shown on the panel's apply button. */
  resultCount: number;
}

// Slide-out catalog filter panel: a "Filter (n)" trigger plus a right-hand
// drawer holding colour / size / price.
//
// Why a drawer at BOTH widths rather than a sidebar that collapses on mobile:
// the always-open sidebar it replaces cost a full column of vertical space —
// 22 swatches, six size boxes and a slider — beside a grid that often holds one
// to four products, so most categories rendered a tall filter rail next to a
// nearly empty grid. Hiding the rail gives the grid the full content width at
// 1280 (three cards across instead of three squeezed into 3/4 of it) and the
// whole viewport at 375, and one code path at both widths means no divergent
// mobile/desktop filter behaviour to keep in sync.
//
// Options come from the response facets (context-aware — see
// docs/API_CONTRACT.md), never a hardcoded list: a fixed size or colour array
// drifts from the catalog the moment a product changes, which is the class of
// bug already fixed twice here.
export const FilterPanel: React.FC<FilterPanelProps> = ({
  colors,
  sizes,
  price,
  filters,
  onChange,
  onClearAll,
  isLoading,
  resultCount,
}) => {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const count = activeFilterCount(filters);

  // Drawer a11y, matching the admin order drawer: Escape closes, Tab is trapped
  // inside the panel, focus moves in on open and back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusables = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));

    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  // Bounds come from the facet, so the control spans the prices that actually
  // exist in this context rather than a hardcoded ceiling.
  const raw = price ?? { min: 0, max: 0 };
  const hasRange = raw.max > raw.min;
  // A round step keeps the thumbs on sensible rupee values on a coarse range.
  const step = raw.max - raw.min > 2000 ? 100 : 50;
  // Snap the ends outward onto the step grid: a real range of ₹2,490–₹7,990
  // stepping by 100 would otherwise offer ₹3,590 and ₹4,690. Snapping outward
  // never excludes a product, and it keeps "at the end = no bound" exact.
  const bounds = hasRange
    ? { min: Math.floor(raw.min / step) * step, max: Math.ceil(raw.max / step) * step }
    : raw;
  const selectedMin = filters.minPrice ?? bounds.min;
  const selectedMax = filters.maxPrice ?? bounds.max;

  // A bound equal to its end of the range is omitted from the URL — that is how
  // the contract expresses "no upper bound" (and keeps a no-op filter out of a
  // shared link).
  const commitMin = (value: number) => {
    const next = Math.min(value, selectedMax);
    onChange({ minPrice: next <= bounds.min ? null : next });
  };
  const commitMax = (value: number) => {
    const next = Math.max(value, selectedMin);
    onChange({ maxPrice: next >= bounds.max ? null : next });
  };

  const sectionHeading = 'font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="filter-trigger"
        className="inline-flex items-center gap-xs border border-outline-variant rounded px-md py-xs font-label-sm text-label-sm uppercase tracking-widest text-on-surface hover:border-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <span className="material-symbols-outlined text-base">tune</span>
        Filter
        {count > 0 && (
          // The count is what tells a shopper the grid is filtered while the
          // panel is shut — without it a short grid looks like a thin catalog.
          <span
            data-testid="filter-count"
            className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-on-primary text-xs"
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-on-background/40 z-50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        aria-hidden={open ? undefined : true}
        data-testid="filter-panel"
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-surface shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {open && (
          <>
            <div className="flex justify-between items-center p-lg border-b border-outline-variant">
              <h2 className="font-display text-headline-md text-primary">Filter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="p-1 text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-lg space-y-xl">
              {/* Colour */}
              <div>
                <h3 className={sectionHeading}>Color</h3>
                {isLoading ? (
                  <div className="flex flex-wrap gap-sm">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="w-8 h-8 rounded-full" />
                    ))}
                  </div>
                ) : colors.length === 0 ? (
                  <p className="font-body-md text-sm text-on-surface-variant">
                    No colours available here.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-sm">
                    {colors.map((color) => {
                      const active = filters.color === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => onChange({ color: active ? null : color.id })}
                          title={`${color.name} (${color.count})`}
                          aria-label={`${color.name}, ${color.count} ${
                            color.count === 1 ? 'piece' : 'pieces'
                          }`}
                          aria-pressed={active}
                          data-testid={`filter-color-${color.id}`}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            active ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant'
                          }`}
                          style={{ backgroundColor: color.hex }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Size — options come from facets.sizes, so a catalog that uses
                  "5.5 METERS" for sarees offers exactly that. */}
              <div>
                <h3 className={sectionHeading}>Size</h3>
                {isLoading ? (
                  <div className="flex flex-wrap gap-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-12 h-9 rounded" />
                    ))}
                  </div>
                ) : sizes.length === 0 ? (
                  <p className="font-body-md text-sm text-on-surface-variant">
                    No sizes available here.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-sm">
                    {sizes.map((size) => {
                      const active = filters.size === size.value;
                      return (
                        <button
                          key={size.value}
                          type="button"
                          onClick={() => onChange({ size: active ? null : size.value })}
                          aria-pressed={active}
                          aria-label={`Size ${size.value}, ${size.count} ${
                            size.count === 1 ? 'piece' : 'pieces'
                          }`}
                          data-testid={`filter-size-${size.value}`}
                          className={`min-w-[2.25rem] h-9 px-xs flex items-center justify-center rounded border text-xs transition-colors ${
                            active
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                          }`}
                        >
                          {size.value}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <h3 className={sectionHeading}>Price Range</h3>
                {isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : !hasRange ? (
                  <p className="font-body-md text-sm text-on-surface-variant">
                    {bounds.max > 0
                      ? `All pieces here are ${formatPrice(bounds.max)}.`
                      : 'No pieces to price.'}
                  </p>
                ) : (
                  <>
                    <div className="price-range relative h-9">
                      {/* Track + selected span, drawn under both thumbs. */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 rounded-full bg-surface-container-highest" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary"
                        style={{
                          left: `${((selectedMin - bounds.min) / (bounds.max - bounds.min)) * 100}%`,
                          right: `${100 - ((selectedMax - bounds.min) / (bounds.max - bounds.min)) * 100}%`,
                        }}
                      />
                      <input
                        type="range"
                        min={bounds.min}
                        max={bounds.max}
                        step={step}
                        value={selectedMin}
                        onChange={(e) => commitMin(Number(e.target.value))}
                        aria-label="Minimum price"
                        data-testid="filter-price-min"
                        className="absolute w-full top-1/2 -translate-y-1/2 h-9"
                      />
                      <input
                        type="range"
                        min={bounds.min}
                        max={bounds.max}
                        step={step}
                        value={selectedMax}
                        onChange={(e) => commitMax(Number(e.target.value))}
                        aria-label="Maximum price"
                        data-testid="filter-price-max"
                        className="absolute w-full top-1/2 -translate-y-1/2 h-9"
                      />
                    </div>
                    <div
                      className="flex justify-between font-body-md text-xs text-on-surface-variant mt-xs"
                      data-testid="filter-price-label"
                    >
                      <span>{formatPrice(selectedMin)}</span>
                      <span>
                        {formatPrice(selectedMax)}
                        {filters.maxPrice === null ? '+' : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-lg border-t border-outline-variant flex items-center gap-sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={onClearAll}
                disabled={count === 0}
                data-testid="filter-clear"
                className="flex-1"
              >
                Clear all
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setOpen(false)}
                data-testid="filter-apply"
                className="flex-1"
              >
                {isLoading
                  ? 'Show results'
                  : `Show ${resultCount} ${resultCount === 1 ? 'piece' : 'pieces'}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
