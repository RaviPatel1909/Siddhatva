import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import { ProductGrid } from '../components/product/ProductGrid';
import { Breadcrumb } from '../components/shared/Breadcrumb';
import { Pagination } from '../components/ui/Pagination';
import { SortSelect } from '../components/ui/SortSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { getProducts } from '../api/products';
import { queryKeys } from '../api/queryKeys';
import { ProductSortOption } from '../api/types';

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
  { value: 'featured', label: 'Sort By: Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

// Customer-facing search results. Reads `q` from the URL (the shareable source of
// truth — the navbar writes it, the heading reflects it), then reuses the Shop All
// machinery: the same products query, the shared <ProductGrid>, and the same
// sort/pagination primitives. Category & colour are on-page filters that AND with the
// text query (unlike Shop All, where category is a route) — so the sidebar filters
// within the search rather than navigating away.
export const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [sort, setSort] = useState<ProductSortOption>('featured');
  const [page, setPage] = useState(1);

  // A new query is a fresh search — drop any filters/pagination from the last one.
  useEffect(() => {
    setActiveCategory(null);
    setActiveColorId(null);
    setSort('featured');
    setPage(1);
  }, [q]);

  const params = {
    q,
    category: activeCategory ?? undefined,
    color: activeColorId ?? undefined,
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

  const handleCategoryClick = (name: string | null) => {
    setActiveCategory((current) => (current === name ? null : name));
    setPage(1);
  };

  const handleColorClick = (id: string | null) => {
    setActiveColorId((current) => (current === id ? null : id));
    setPage(1);
  };

  // The friendly "nothing matches your search" state is for a bare query with no
  // hits. If a category/colour filter is what emptied the grid, keep the sidebar up
  // (with an inline note) so the shopper can loosen the filter instead.
  const hasActiveFilter = activeCategory !== null || activeColorId !== null;
  const noResults =
    !isLoading && !isError && q.length > 0 && items.length === 0 && !hasActiveFilter;

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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
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
                  onChange={(value) => setSort(value as ProductSortOption)}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-xl">
                {/* Filter Sidebar — category & colour AND with the text query. */}
                <aside className="md:col-span-1 space-y-xl">
                  <div>
                    <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                      Refine by Category
                    </h3>
                    {data ? (
                      <ul className="space-y-sm">
                        {facetCategories.map((cat) => (
                          <li key={cat.name}>
                            <button
                              onClick={() => handleCategoryClick(cat.name)}
                              className={`font-body-md text-sm transition-colors ${
                                activeCategory === cat.name
                                  ? 'text-primary font-semibold'
                                  : 'text-on-surface-variant hover:text-primary'
                              }`}
                            >
                              {cat.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="space-y-sm">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 w-24" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                      Color
                    </h3>
                    <div className="flex flex-wrap gap-sm">
                      {data
                        ? facetColors.map((color) => (
                            <button
                              key={color.id}
                              onClick={() => handleColorClick(color.id)}
                              title={color.name}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                activeColorId === color.id
                                  ? 'border-primary ring-2 ring-primary/30'
                                  : 'border-outline-variant'
                              }`}
                              style={{ backgroundColor: color.hex }}
                            />
                          ))
                        : Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="w-8 h-8 rounded-full" />
                          ))}
                    </div>
                  </div>
                </aside>

                {/* Product Grid */}
                <div className="md:col-span-3">
                  <ProductGrid
                    items={items}
                    isLoading={isLoading}
                    isError={isError}
                    isPlaceholderData={isPlaceholderData}
                    onRetry={() => refetch()}
                  />
                  {!isLoading && !isError && items.length === 0 && (
                    <p className="text-center text-on-surface-variant py-xl">
                      No pieces match these filters.
                    </p>
                  )}
                  {!isLoading && !isError && (
                    <div className="flex justify-center mt-xl">
                      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};
