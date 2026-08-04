import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import { ProductGrid } from '../components/product/ProductGrid';
import { FilterPanel } from '../components/product/FilterPanel';
import { Breadcrumb } from '../components/shared/Breadcrumb';
import { Pagination } from '../components/ui/Pagination';
import { SortSelect } from '../components/ui/SortSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
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

// Customer-facing search results. Reads `q` from the URL (the shareable source of
// truth — the navbar writes it, the heading reflects it), then reuses the Shop All
// machinery: the same products query, the shared <ProductGrid>, the shared
// <FilterPanel>, and the same sort/pagination primitives. Category is an on-page
// refinement here (unlike Shop All, where it is the route), so it ANDs with the
// text query rather than navigating away.
//
// Every refinement lives in the URL alongside `q`. A new search from the navbar
// navigates to a bare /search?q=… , which drops the previous query's filters,
// sort and page for free.
export const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();

  const filters = parseFilters(searchParams);
  const activeCategory = searchParams.get('category');
  const sort = (searchParams.get('sort') as ProductSortOption | null) ?? 'featured';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));

  const params = {
    q,
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
    enabled: q.length > 0,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const facetCategories = data?.facets.categories ?? [];
  const facetColors = data?.facets.colors ?? [];
  const facetSizes = data?.facets.sizes ?? [];

  const applyFilters = (next: Partial<CatalogFilters>) => {
    setSearchParams(writeFilters(searchParams, { ...filters, ...next }));
  };

  // "Clear all" on a search view clears the category refinement too — it is one
  // of the filters here, not navigation.
  const clearFilters = () => {
    const next = writeFilters(searchParams, EMPTY_FILTERS);
    next.delete('category');
    setSearchParams(next);
  };

  const handleCategoryClick = (name: string) => {
    const next = new URLSearchParams(searchParams);
    if (activeCategory === name) next.delete('category');
    else next.set('category', name);
    next.delete('page');
    setSearchParams(next);
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

  // The friendly "nothing matches your search" state is for a bare query with no
  // hits. If a filter is what emptied the grid, keep the controls up (with an
  // inline note) so the shopper can loosen the filter instead.
  const hasAnyRefinement = hasActiveFilters(filters) || activeCategory !== null;
  const noResults =
    !isLoading && !isError && q.length > 0 && items.length === 0 && !hasAnyRefinement;

  const categoryChip = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-md py-xs font-label-sm text-label-sm uppercase tracking-widest transition-colors ${
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
    }`;

  return (
    <MainLayout>
      <Seo
        title={q ? `Search: ${q}` : 'Search'}
        description="Search the Siddhatva collection — find luxe minimalist pieces by name or category."
        canonicalPath="/search"
        noindex
      />
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />

        {/* Blank query → a graceful prompt rather than an empty or error state. */}
        {q.length === 0 ? (
          <EmptyState
            icon="search"
            title="Search the collection"
            description="Type a product name or category in the search bar to find pieces."
            actionLabel="Browse all collections"
            onAction={() => navigate('/shop')}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
              <div>
                <h1 className="font-display text-headline-lg text-on-surface">
                  Results for “{q}”
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                  {isLoading
                    ? 'Searching the atelier…'
                    : `${total} ${total === 1 ? 'piece' : 'pieces'} found.`}
                </p>
              </div>
              {!noResults && (
                <SortSelect
                  className="w-56"
                  ariaLabel="Sort products"
                  options={SORT_OPTIONS}
                  value={sort}
                  onChange={handleSortChange}
                />
              )}
            </div>

            {noResults ? (
              <EmptyState
                icon="search_off"
                title={`No products match “${q}”`}
                description="Try a different search term, or browse the full collection."
                actionLabel="Browse the collection"
                onAction={() => navigate('/shop')}
              />
            ) : (
              <>
                {/* Refine by category — ANDs with the text query. */}
                <div className="flex items-center gap-sm overflow-x-auto pb-xs -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
                  {data
                    ? facetCategories.map((cat) => (
                        <button
                          key={cat.name}
                          onClick={() => handleCategoryClick(cat.name)}
                          className={categoryChip(activeCategory === cat.name)}
                        >
                          {cat.name}
                        </button>
                      ))
                    : Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-24 rounded-full" />
                      ))}
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
                  {hasAnyRefinement && (
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
                {!isLoading && !isError && items.length === 0 && (
                  <p className="text-center text-on-surface-variant py-xl" data-testid="no-matches">
                    No pieces match these filters.
                  </p>
                )}
                {!isLoading && !isError && (
                  <div className="flex justify-center mt-xl">
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};
