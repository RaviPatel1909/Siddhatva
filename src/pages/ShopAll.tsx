import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProductCard } from '../components/product/ProductCard';
import { Breadcrumb } from '../components/shared/Breadcrumb';
import { Pagination } from '../components/ui/Pagination';
import { SortSelect } from '../components/ui/SortSelect';
import { useCart } from '../context/CartContext';
import { categories, products } from '../data/products';
import { Color } from '../types/product';

const PAGE_SIZE = 8;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

type SortOption = 'featured' | 'price-asc' | 'price-desc';

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
  const [sort, setSort] = useState<SortOption>('featured');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  const uniqueColors = useMemo(() => {
    const seen = new Map<string, Color>();
    products.forEach((product) => product.colors.forEach((color) => seen.set(color.id, color)));
    return Array.from(seen.values());
  }, []);

  const categoryCounts = useMemo(
    () =>
      categories.map((category) => ({
        name: category,
        count: products.filter((product) => product.category === category).length,
      })),
    []
  );

  const filtered = useMemo(() => {
    let list = products.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory;
      const matchesColor = !activeColorId || product.colors.some((c) => c.id === activeColorId);
      return matchesCategory && matchesColor;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [activeCategory, activeColorId, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCategoryClick = (name: string | null) => {
    navigate(name ? `/shop/${name}` : '/shop');
  };

  const handleColorClick = (id: string | null) => {
    setActiveColorId((current) => (current === id ? null : id));
    setPage(1);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'All Collections' }]} />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">All Collections</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
              {filtered.length} pieces curated for the discerning wardrobe.
            </p>
          </div>
          <SortSelect
            className="w-56"
            ariaLabel="Sort products"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(value) => setSort(value as SortOption)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-xl">
          {/* Filter Sidebar */}
          <aside className="md:col-span-1 space-y-xl">
            <div>
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                Categories
              </h3>
              <ul className="space-y-sm">
                <li>
                  <button
                    onClick={() => handleCategoryClick(null)}
                    className={`font-body-md text-sm transition-colors ${
                      activeCategory === null ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    All ({products.length})
                  </button>
                </li>
                {categoryCounts.map((cat) => (
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
            </div>

            <div>
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface mb-md">
                Color
              </h3>
              <div className="flex flex-wrap gap-sm">
                {uniqueColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleColorClick(color.id)}
                    title={color.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      activeColorId === color.id ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
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
              <input type="range" min="0" max="1500" defaultValue="1500" className="w-full accent-primary" disabled />
              <div className="flex justify-between text-xs text-on-surface-variant mt-xs">
                <span>$0</span>
                <span>$1,500+</span>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-gutter">
              {pageItems.map((product) => (
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
            {pageItems.length === 0 && (
              <p className="text-center text-on-surface-variant py-xl">No pieces match these filters.</p>
            )}
            <div className="flex justify-center mt-xl">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
