import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/product/ProductCardSkeleton';
import { Breadcrumb } from '../components/shared/Breadcrumb';
import { Pagination } from '../components/ui/Pagination';
import { SortSelect } from '../components/ui/SortSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useCart } from '../context/CartContext';
import { getProducts } from '../api/products';
import { queryKeys } from '../api/queryKeys';
import { ProductSortOption } from '../api/types';

const PAGE_SIZE = 8;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Sort By: Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export const ShopAllPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { category } = useParams<{ category?: string }>();
  const activeCategory = category ?? null;
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [sort, setSort] = useState<ProductSortOption>('featured');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  const params = {
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
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const facetCategories = data?.facets.categories ?? [];
  const facetColors = data?.facets.colors ?? [];
  const catalogTotal = facetCategories.reduce((sum, c) => sum + c.count, 0);

  const handleCategoryClick = (name: string | null) => {
    navigate(name ? `/shop/${name}` : '/shop');
  };

  const handleColorClick = (id: string | null) => {
    setActiveColorId((current) => (current === id ? null : id));
    setPage(1);
  };

  const catTitle = activeCategory ? `${activeCategory} Collection` : 'Shop All';
  const catDesc = activeCategory
    ? `Shop ${activeCategory.toLowerCase()} pieces from Siddhatva — luxe minimalist editorial fashion crafted with intention.`
    : 'Browse the full Siddhatva collection — luxe minimalist editorial fashion in bronze, blush and champagne.';

  return (
    <MainLayout>
      <Seo title={catTitle} description={catDesc} canonicalPath={activeCategory ? `/shop/${activeCategory}` : '/shop'} />
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'All Collections' }]} />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
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
            onChange={(value) => setSort(value as ProductSortOption)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-xl">
          {/* Filter Sidebar */}
          <aside className="md:col-span-1 space-y-xl">
            <div>
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                Categories
              </h3>
              {data ? (
                <ul className="space-y-sm">
                  <li>
                    <button
                      onClick={() => handleCategoryClick(null)}
                      className={`font-body-md text-sm transition-colors ${
                        activeCategory === null ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      All ({catalogTotal})
                    </button>
                  </li>
                  {facetCategories.map((cat) => (
                    <li key={cat.name}>
                      <button
                        onClick={() => handleCategoryClick(cat.name)}
                        className={`font-body-md text-sm transition-colors ${
                          activeCategory === cat.name ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-primary'
                        }`}
                      >
                        {cat.name} ({cat.count})
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
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
                          activeColorId === color.id ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))
                  : Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="w-8 h-8 rounded-full" />)}
              </div>
            </div>

            <div>
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                Size
              </h3>
              <div className="flex flex-wrap gap-sm">
                {SIZES.map((size) => (
                  <span
                    key={size}
                    className="w-9 h-9 flex items-center justify-center rounded border border-outline-variant text-xs text-on-surface-variant"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                Price Range
              </h3>
              <input type="range" min="0" max="8000" defaultValue="8000" className="w-full accent-primary" disabled />
              <div className="flex justify-between text-xs text-on-surface-variant mt-xs">
                <span>₹0</span>
                <span>₹8,000+</span>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="md:col-span-3">
            {isError ? (
              <ErrorState
                title="Couldn't load the collection"
                message="We had trouble reaching the atelier. Please try again."
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-gutter">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <div
                  className={`grid grid-cols-2 lg:grid-cols-3 gap-gutter transition-opacity ${
                    isPlaceholderData ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      image={product.images[0].src}
                      imageAlt={product.images[0].alt}
                      subtitle={product.variant}
                      badge={product.badge}
                      soldOut={product.status === 'out-of-stock'}
                      onViewDetails={() => navigate(`/product/${product.id}`)}
                      onAddToCart={() => addItem(product, product.colors[0], product.sizes[0])}
                    />
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="text-center text-on-surface-variant py-xl">No pieces match these filters.</p>
                )}
                <div className="flex justify-center mt-xl">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
