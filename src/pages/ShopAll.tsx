import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import { ProductGrid } from '../components/product/ProductGrid';
import { FilterPanel } from '../components/product/FilterPanel';
import { Breadcrumb } from '../components/shared/Breadcrumb';
import { Pagination } from '../components/ui/Pagination';
import { SortSelect } from '../components/ui/SortSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { getProducts } from '../api/products';
import { queryKeys } from '../api/queryKeys';
import { ProductSortOption } from '../api/types';
import {
  CatalogFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  parseFilters,
  writeFilters,
} from '../lib/catalogFilters';

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { value: 'featured', label: 'Sort By: Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export const ShopAllPage: React.FC = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = category ?? null;

  // All filter/sort/page state lives in the URL, so a filtered grid is
  // shareable and back/forward moves through refinements (see
  // src/lib/catalogFilters.ts). Category stays the route.
  const filters = parseFilters(searchParams);
  const sort = (searchParams.get('sort') as ProductSortOption | null) ?? 'featured';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const params = {
    category: activeCategory ?? undefined,
    color: filters.color ?? undefined,
    size: filters.size ?? undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => getProducts(params),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const facetCategories = data?.facets.categories ?? [];
  const facetColors = data?.facets.colors ?? [];
  const facetSizes = data?.facets.sizes ?? [];
  const catalogTotal = facetCategories.reduce((sum, c) => sum + c.count, 0);

  // Every filter change drops `page` (writeFilters), so a refinement can never
  // strand the shopper on a page that no longer exists.
  const applyFilters = (next: Partial<CatalogFilters>) => {
    setSearchParams(writeFilters(searchParams, { ...filters, ...next }), { replace: false });
  };

  const clearFilters = () => {
    setSearchParams(writeFilters(searchParams, EMPTY_FILTERS), { replace: false });
  };

  const handleSortChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', value);
    next.delete('page');
    setSearchParams(next);
  };

  const handlePageChange = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  // Switching category is a route change; filters do not carry across, since a
  // colour or size that exists in one category often does not in the next.
  const handleCategoryClick = (name: string | null) => {
    navigate(name ? `/shop/${name}` : '/shop');
  };

  const catTitle = activeCategory ? `${activeCategory} Collection` : 'Shop All';
  const catDesc = activeCategory
    ? `Shop ${activeCategory.toLowerCase()} pieces from Siddhatva — luxe minimalist editorial fashion crafted with intention.`
    : 'Browse the full Siddhatva collection — luxe minimalist editorial fashion in bronze, blush and champagne.';

  const categoryChip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-md py-xs font-label-sm text-label-sm uppercase tracking-widest transition-colors ${
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
    }`;

  return (
    <MainLayout>
      <Seo title={catTitle} description={catDesc} canonicalPath={activeCategory ? `/shop/${activeCategory}` : '/shop'} />
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'All Collections' }]} />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">All Collections</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
              {data ? `${total} pieces curated for the discerning wardrobe.` : 'Curating the collection…'}
            </p>
          </div>
          <SortSelect
            className="w-56"
            ariaLabel="Sort products"
            options={SORT_OPTIONS}
            value={sort}
            onChange={handleSortChange}
          />
        </div>

        {/* Categories are navigation, so they stay on the page as a horizontal
            rail rather than moving into the panel — one row instead of the old
            sidebar column. */}
        <div className="flex items-center gap-sm overflow-x-auto pb-xs -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
          {data ? (
            <>
              <button onClick={() => handleCategoryClick(null)} className={categoryChip(activeCategory === null)}>
                All ({catalogTotal})
              </button>
              {facetCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className={categoryChip(activeCategory === cat.name)}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </>
          ) : (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
          )}
        </div>

        <div className="flex items-center justify-between gap-md mt-md mb-xl">
          <FilterPanel
            colors={facetColors}
            sizes={facetSizes}
            price={data?.facets.price}
            filters={filters}
            onChange={applyFilters}
            onClearAll={clearFilters}
            isLoading={isLoading}
            resultCount={total}
          />
          {hasActiveFilters(filters) && (
            <button
              onClick={clearFilters}
              data-testid="clear-filters-inline"
              className="font-body-md text-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <ProductGrid
          items={items}
          isLoading={isLoading}
          isError={isError}
          isPlaceholderData={isPlaceholderData}
          onRetry={() => refetch()}
        />
        {!isLoading && !isError && (
          <>
            {items.length === 0 && (
              <p className="text-center text-on-surface-variant py-xl" data-testid="no-matches">
                No pieces match these filters.
              </p>
            )}
            <div className="flex justify-center mt-xl">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};
