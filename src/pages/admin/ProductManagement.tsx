import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ProductEditor } from '../../components/admin/ProductEditor';
import { getProducts } from '../../api/products';
import {
  AdminProduct,
  bulkDeleteProducts,
  bulkStatusProducts,
  deleteProduct,
  getAdminProduct,
} from '../../api/admin';
import { categories } from '../../data/products';

const PAGE_SIZE = 8;
const STOCK_MAX = 40;
const STOCK_TRACK = 'bg-surface-container-highest';
const stockFill = (stock: number) => {
  if (stock === 0) return 'bg-danger';
  if (stock < 10) return 'bg-warning';
  return 'bg-success';
};

export const ProductManagementPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products-list'],
    queryFn: () => getProducts({ pageSize: 200 }),
  });
  const products = useMemo(() => data?.items ?? [], [data]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminProduct | 'create' | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'products-list'] });
    qc.invalidateQueries({ queryKey: ['products'] }); // storefront reflects changes
  };

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
  }, [products, search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((p) => next.delete(p.id));
      else pageItems.forEach((p) => next.add(p.id));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openEdit = async (id: string) => {
    const product = await getAdminProduct(id);
    setEditing(product);
  };

  const runDelete = async (ids: string[]) => {
    setBusy(true);
    try {
      if (ids.length === 1) await deleteProduct(ids[0]);
      else await bulkDeleteProducts(ids);
      setSelected(new Set());
      invalidate();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const runBulkStatus = async (next: 'active' | 'draft' | 'out-of-stock') => {
    if (!selected.size) return;
    setBusy(true);
    try {
      await bulkStatusProducts([...selected], next);
      setSelected(new Set());
      invalidate();
    } finally {
      setBusy(false);
    }
  };

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
        <button
          onClick={() => setEditing('create')}
          className="px-md py-sm bg-primary text-on-primary rounded-full text-label-sm font-label-sm flex items-center gap-xs bronze-shadow hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Product
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
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-surface-container-lowest border border-outline-variant rounded-full px-md py-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        <button onClick={clearFilters} className="p-2 text-on-surface-variant hover:text-primary transition-colors" aria-label="Clear filters">
          <span className="material-symbols-outlined">filter_alt_off</span>
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-sm bg-primary/5 border border-primary/20 rounded-xl px-md py-sm mb-lg">
          <span className="text-sm text-on-surface font-medium">{selected.size} selected</span>
          <span className="text-outline">·</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) runBulkStatus(e.target.value as 'active' | 'draft' | 'out-of-stock');
              e.target.value = '';
            }}
            disabled={busy}
            className="bg-surface border border-outline-variant rounded-full px-md py-1 text-sm"
          >
            <option value="" disabled>Set status…</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
          <button
            onClick={() => setConfirm({ ids: [...selected], label: `${selected.size} products` })}
            disabled={busy}
            className="text-sm text-error hover:underline flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span> Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-on-surface-variant hover:text-primary">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-lowest/60 p-lg rounded-xl bronze-shadow border border-outline-variant/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant/30">
              <tr>
                <th className="py-md w-8">
                  <input type="checkbox" className="accent-primary" checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="Select all" />
                </th>
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
                  <td className="py-md">
                    <input type="checkbox" className="accent-primary" checked={selected.has(product.id)} onChange={() => toggleOne(product.id)} aria-label={`Select ${product.name}`} />
                  </td>
                  <td className="py-md">
                    <div className="flex items-center gap-sm">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                        {product.images[0] && <img src={product.images[0].src} alt={product.name} className="w-full h-full object-cover" />}
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
                      <div className={`w-16 h-1.5 rounded-full ${STOCK_TRACK} overflow-hidden`}>
                        <div className={`h-full ${stockFill(product.stock ?? 0)}`} style={{ width: `${Math.min(100, ((product.stock ?? 0) / STOCK_MAX) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-on-surface-variant">{product.stock ?? 0}</span>
                    </div>
                  </td>
                  <td className="py-md">
                    <Badge variant={product.status ?? 'active'}>{product.status ?? 'active'}</Badge>
                  </td>
                  <td className="py-md">
                    <div className="flex justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(product.id)} className="p-1 text-on-surface-variant hover:text-primary hover:scale-110 transition-all" aria-label={`Edit ${product.name}`}>
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => setConfirm({ ids: [product.id], label: product.name })} className="p-1 text-on-surface-variant hover:text-error hover:scale-110 transition-all" aria-label={`Delete ${product.name}`}>
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <p className="text-center text-on-surface-variant py-xl">Loading…</p>}
          {!isLoading && pageItems.length === 0 && (
            <p className="text-center text-on-surface-variant py-xl">No products match these filters.</p>
          )}
        </div>
        <div className="mt-lg flex justify-between items-center">
          <p className="text-xs text-on-surface-variant">Showing {pageItems.length} of {filtered.length} products</p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {editing !== null && (
        <ProductEditor
          initial={editing === 'create' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/50 p-md" onClick={() => !busy && setConfirm(null)}>
          <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="font-display text-headline-md text-primary mb-sm">Delete {confirm.label}?</h3>
            <p className="text-sm text-on-surface-variant mb-lg">
              This permanently removes the product{confirm.ids.length > 1 ? 's' : ''} and any uploaded images. This can&apos;t be undone.
            </p>
            <div className="flex justify-end gap-sm">
              <button onClick={() => setConfirm(null)} disabled={busy} className="px-lg py-sm rounded-lg text-sm text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={() => runDelete(confirm.ids)} disabled={busy} className="px-lg py-sm rounded-lg text-sm bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
