import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ImageUploader, UploaderImage } from './ImageUploader';
import {
  AdminProduct,
  ProductColorInput,
  ProductInput,
  createProduct,
  updateProduct,
} from '../../api/admin';
import { categories as CATEGORY_OPTIONS } from '../../data/products';

interface ProductEditorProps {
  initial: AdminProduct | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

const slugId = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'colour';

export const ProductEditor: React.FC<ProductEditorProps> = ({ initial, onClose, onSaved }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? ''));
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [variantLabel, setVariantLabel] = useState(initial?.variant ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [badge, setBadge] = useState<string>(initial?.badge ?? '');
  const [stock, setStock] = useState(String(initial?.stock ?? ''));
  const [colors, setColors] = useState<ProductColorInput[]>(initial?.colors ?? []);
  const [sizes, setSizes] = useState<string[]>(initial?.sizes ?? []);
  const [stockMap, setStockMap] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    initial?.variants.forEach((v) => (m[`${v.colorId}|${v.size}`] = v.stock));
    return m;
  });
  const [images, setImages] = useState<UploaderImage[]>(
    initial?.images.map((i) => ({ url: i.url, publicId: i.publicId, alt: i.alt })) ?? []
  );
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#b87b5a');
  const [newSize, setNewSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cell = (colorId: string, size: string) => `${colorId}|${size}`;

  const addColor = () => {
    const trimmed = newColorName.trim();
    if (!trimmed) return;
    const id = slugId(trimmed);
    if (colors.some((c) => c.id === id)) return;
    setColors([...colors, { id, name: trimmed, hex: newColorHex }]);
    setNewColorName('');
  };
  const removeColor = (id: string) => setColors(colors.filter((c) => c.id !== id));

  const addSize = () => {
    const trimmed = newSize.trim().toUpperCase();
    if (!trimmed || sizes.includes(trimmed)) return;
    setSizes([...sizes, trimmed]);
    setNewSize('');
  };
  const removeSize = (s: string) => setSizes(sizes.filter((x) => x !== s));

  const setCell = (colorId: string, size: string, value: string) =>
    setStockMap((prev) => ({ ...prev, [cell(colorId, size)]: Math.max(0, Number(value) || 0) }));

  const valid =
    name.trim() && Number(price) >= 0 && price !== '' && category.trim() && colors.length && sizes.length;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const variants = colors.flatMap((c) =>
      sizes.map((s) => ({ colorId: c.id, size: s, stock: stockMap[cell(c.id, s)] ?? 0 }))
    );
    const body: ProductInput = {
      name: name.trim(),
      price: Number(price),
      description,
      category: category.trim(),
      variant: variantLabel.trim() || undefined,
      sku: sku.trim() || undefined,
      badge: (badge || null) as ProductInput['badge'],
      status: status as ProductInput['status'],
      stock: stock === '' ? undefined : Number(stock),
      colors,
      sizes,
      variants,
      images: images.map((i) => ({ url: i.url, publicId: i.publicId, alt: i.alt })),
    };
    try {
      if (initial) await updateProduct(initial.id, body);
      else await createProduct(body);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-on-background/50 p-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Edit product' : 'New product'}
        className="w-full max-w-3xl my-lg bg-surface rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 sticky top-0 bg-surface rounded-t-2xl">
          <h3 className="font-display text-headline-md text-primary">
            {initial ? 'Edit Product' : 'New Product'}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-lg space-y-lg">
          {error && (
            <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-md py-sm text-sm text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="sm:col-span-2">
              <label className={labelClass}>Name</label>
              <input aria-label="Product name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Price (USD)</label>
              <input aria-label="Price" type="number" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>SKU</label>
              <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input aria-label="Category" className={inputClass} list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} />
              <datalist id="category-options">
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Variant label</label>
              <input className={inputClass} value={variantLabel} onChange={(e) => setVariantLabel(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="out-of-stock">Out of stock</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Badge</label>
              <select className={inputClass} value={badge} onChange={(e) => setBadge(e.target.value)}>
                <option value="">None</option>
                <option value="new">New</option>
                <option value="limited">Limited</option>
                <option value="sold-out">Sold out</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Total stock</label>
              <input type="number" className={inputClass} value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea className={`${inputClass} min-h-20`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className={labelClass}>Images</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* Colours + sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <div>
              <label className={labelClass}>Colours</label>
              <div className="flex flex-wrap gap-xs mb-sm">
                {colors.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-xs bg-surface-container rounded-full pl-xs pr-sm py-1 text-sm">
                    <span className="w-4 h-4 rounded-full border border-outline-variant" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    <button onClick={() => removeColor(c.id)} aria-label={`Remove ${c.name}`} className="text-on-surface-variant hover:text-error">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-xs">
                <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-9 h-9 rounded border border-outline-variant bg-surface" aria-label="Colour" />
                <input className={inputClass} placeholder="Colour name" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())} />
                <Button type="button" variant="secondary" size="sm" onClick={addColor} aria-label="Add colour">Add</Button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Sizes</label>
              <div className="flex flex-wrap gap-xs mb-sm">
                {sizes.map((s) => (
                  <span key={s} className="inline-flex items-center gap-xs bg-surface-container rounded-full pl-sm pr-sm py-1 text-sm">
                    {s}
                    <button onClick={() => removeSize(s)} aria-label={`Remove ${s}`} className="text-on-surface-variant hover:text-error">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-xs">
                <input className={inputClass} placeholder="e.g. M or 42" value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())} />
                <Button type="button" variant="secondary" size="sm" onClick={addSize} aria-label="Add size">Add</Button>
              </div>
            </div>
          </div>

          {/* Variant matrix */}
          {colors.length > 0 && sizes.length > 0 && (
            <div>
              <label className={labelClass}>Stock per colour × size</label>
              <div className="overflow-x-auto border border-outline-variant/30 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container-low">
                      <th className="text-left px-sm py-xs font-label-sm text-outline uppercase tracking-wider">Colour</th>
                      {sizes.map((s) => (
                        <th key={s} className="px-sm py-xs font-label-sm text-outline uppercase tracking-wider text-center">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((c) => (
                      <tr key={c.id} className="border-b border-outline-variant/10">
                        <td className="px-sm py-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-xs">
                            <span className="w-3 h-3 rounded-full border border-outline-variant" style={{ backgroundColor: c.hex }} />
                            {c.name}
                          </span>
                        </td>
                        {sizes.map((s) => (
                          <td key={s} className="px-sm py-xs">
                            <input
                              type="number"
                              min={0}
                              aria-label={`${c.name} ${s} stock`}
                              className="w-16 bg-surface border border-outline-variant rounded px-sm py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={stockMap[cell(c.id, s)] ?? 0}
                              onChange={(e) => setCell(c.id, s, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-outline-variant/30 sticky bottom-0 bg-surface rounded-b-2xl">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} isLoading={saving} disabled={!valid}>
            {initial ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>
    </div>
  );
};
