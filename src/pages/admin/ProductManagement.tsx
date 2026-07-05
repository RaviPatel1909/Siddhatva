import React, { useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { categories, products } from '../../data/products';

const PAGE_SIZE = 8;
const STOCK_MAX = 40;

const stockColor = (stock: number) => {
  if (stock === 0) return 'bg-error';
  if (stock < 10) return 'bg-tertiary';
  return 'bg-primary';
};

export const ProductManagementPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || product.category === category;
      const matchesStatus = status === 'all' || product.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Products</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage your catalog and inventory levels.</p>
        </div>
        <button className="px-md py-sm bg-primary text-on-primary rounded-full text-label-sm font-label-sm flex items-center gap-xs bronze-shadow">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Collection
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-sm items-center bg-surface-container-lowest/60 p-md rounded-xl border border-outline-variant/20 mb-lg">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products or SKU..."
          className="flex-1 min-w-[200px] bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        <button
          onClick={clearFilters}
          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Clear filters"
        >
          <span className="material-symbols-outlined">filter_alt_off</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/30">
              <tr>
                <th className="py-md w-8"><input type="checkbox" className="accent-primary" /></th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Product</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">SKU</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Category</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Price</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Stock</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Status</th>
                <th className="py-md font-label-sm text-label-sm text-outline uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {pageItems.map((product) => (
                <tr key={product.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group">
                  <td className="py-md"><input type="checkbox" className="accent-primary" /></td>
                  <td className="py-md">
                    <div className="flex items-center gap-sm">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                        <img src={product.images[0].src} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{product.name}</p>
                        <p className="text-xs text-on-surface-variant">{product.variant}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-md text-on-surface-variant">{product.sku}</td>
                  <td className="py-md text-on-surface-variant">{product.category}</td>
                  <td className="py-md font-medium">${product.price.toFixed(2)}</td>
                  <td className="py-md">
                    <div className="flex items-center gap-xs">
                      <div className="w-16 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                        <div
                          className={`h-full ${stockColor(product.stock ?? 0)}`}
                          style={{ width: `${Math.min(100, ((product.stock ?? 0) / STOCK_MAX) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-on-surface-variant">{product.stock ?? 0}</span>
                    </div>
                  </td>
                  <td className="py-md">
                    <Badge variant={product.status ?? 'active'}>{product.status ?? 'active'}</Badge>
                  </td>
                  <td className="py-md">
                    <div className="flex justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 text-on-surface-variant hover:text-primary hover:scale-110 transition-all" aria-label="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button className="p-1 text-on-surface-variant hover:text-primary hover:scale-110 transition-all" aria-label="Duplicate">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                      <button className="p-1 text-on-surface-variant hover:text-error hover:scale-110 transition-all" aria-label="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageItems.length === 0 && (
            <p className="text-center text-on-surface-variant py-xl">No products match these filters.</p>
          )}
        </div>
        <div className="mt-lg flex justify-between items-center">
          <p className="text-xs text-on-surface-variant">Showing {pageItems.length} of {filtered.length} products</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </AdminLayout>
  );
};
