import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { CartLineItem } from '../components/cart/CartLineItem';
import { OrderSummaryCard } from '../components/cart/OrderSummaryCard';
import { EmptyState } from '../components/ui/EmptyState';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';

export const ShoppingBagPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, subtotal, itemCount } = useCart();

  const shipping = subtotal > 500 || subtotal === 0 ? 0 : 15;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const recommended = useMemo(() => {
    const cartProductIds = new Set(items.map((item) => item.product.id));
    return products.filter((product) => !cartProductIds.has(product.id)).slice(0, 3);
  }, [items]);

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-margin-mobile py-24">
          <EmptyState
            icon="shopping_bag"
            title="Your bag is empty"
            description="Pieces you add to your bag will appear here, ready for a considered checkout."
            actionLabel="Start Shopping"
            onAction={() => navigate('/shop')}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="pb-24 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto min-h-screen">
        <div className="mb-xl text-center md:text-left pt-xl">
          <h1 className="font-display text-4xl md:text-5xl text-primary font-light tracking-tight">
            Your Shopping Bag
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-base uppercase tracking-widest">
            {itemCount} {itemCount === 1 ? 'Item' : 'Items'} in your selection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Items List */}
          <div className="lg:col-span-8">
            <div className="space-y-8">
              {items.map((item) => (
                <CartLineItem
                  key={item.id}
                  image={item.product.images[0].src}
                  name={item.product.name}
                  variant={`${item.color.name} / Size ${item.size}`}
                  price={item.product.price}
                  quantity={item.quantity}
                  onQuantityChange={(qty) => updateQuantity(item.id, qty)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
            <div className="mt-12">
              <button
                onClick={() => navigate('/shop')}
                className="flex items-center gap-2 text-primary hover:-translate-x-1 transition-transform duration-300 font-body-md text-sm uppercase tracking-widest font-medium"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Continue Shopping
              </button>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-4">
            <OrderSummaryCard
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={total}
              showDiscountInput
              ctaLabel="Checkout"
              onCta={() => navigate('/checkout')}
              note={
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <div>
                    <h4 className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                      Curated Service
                    </h4>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Enjoy our signature white-glove delivery experience for this selection.
                    </p>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* Recommended — bento grid: first card double-width and square */}
        {recommended.length > 0 && (
          <div className="mt-24 pt-24 border-t border-outline-variant/30">
            <h2 className="font-display text-3xl text-primary font-light tracking-tight mb-xl">
              Curated for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
              {recommended.map((product, index) => (
                <div
                  key={product.id}
                  className={`group cursor-pointer ${index === 0 ? 'md:col-span-2' : ''}`}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div
                    className={`relative bg-surface-container-low rounded-lg overflow-hidden ${
                      index === 0 ? 'aspect-square' : 'aspect-[3/4]'
                    }`}
                  >
                    <img
                      src={product.images[0].src}
                      alt={product.images[0].alt}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    {index === 0 && (
                      <div className="absolute bottom-4 left-4">
                        <span className="bg-background/90 backdrop-blur-sm border border-primary/20 px-4 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                          New In
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-medium text-on-surface">{product.name}</h4>
                      <p className="text-xs text-on-surface-variant italic">{product.variant}</p>
                    </div>
                    <span className="text-sm font-medium text-primary">${product.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
