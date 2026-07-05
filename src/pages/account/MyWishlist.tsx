import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountLayout } from '../../components/layout/AccountLayout';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export const MyWishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { items, removeItem } = useWishlist();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const animateOut = (id: string, after: () => void) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      after();
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  const handleRemove = (id: string) => animateOut(id, () => removeItem(id));

  const handleMoveToBag = (id: string) => {
    const product = items.find((p) => p.id === id);
    if (!product) return;
    addItem(product, product.colors[0], product.sizes[0]);
    animateOut(id, () => removeItem(id));
  };

  return (
    <AccountLayout>
      <div className="flex items-center justify-between mb-xl">
        <h1 className="font-display text-3xl text-primary">My Wishlist</h1>
        <p className="text-sm text-on-surface-variant">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="favorite"
          title="Your wishlist is empty"
          description="Save pieces you love and they'll appear here for easy access later."
          actionLabel="Start Shopping"
          onAction={() => navigate('/shop')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {items.map((product) => {
            const isRemoving = removingIds.has(product.id);
            return (
              <div
                key={product.id}
                className={`group transition-all duration-300 ${isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
              >
                <div
                  className="relative aspect-[3/4] bg-surface-container-low rounded-lg overflow-hidden mb-md cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <img
                    src={product.images[0].src}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.badge === 'new' && (
                    <span className="absolute top-md left-md">
                      <Badge variant="new">New Arrival</Badge>
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(product.id);
                    }}
                    className="absolute top-md right-md w-8 h-8 rounded-full bg-surface/90 flex items-center justify-center
                              opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:text-error"
                    aria-label="Remove from wishlist"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                  <div
                    className="absolute bottom-md left-1/2 -translate-x-1/2 w-[calc(100%-32px)]
                              md:opacity-0 md:group-hover:opacity-100 md:translate-y-4 md:group-hover:translate-y-0
                              transition-all duration-300"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToBag(product.id);
                      }}
                      className="w-full bg-primary text-on-primary font-label-sm py-md rounded uppercase tracking-widest
                                hover:opacity-90 transition-opacity active:scale-95"
                    >
                      Move to Bag
                    </button>
                  </div>
                </div>
                <h4 className="text-[15px] text-on-surface">{product.name}</h4>
                <p className="text-sm text-on-surface-variant">{product.variant}</p>
                <p className="text-base font-semibold text-primary mt-xs">${product.price.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
};
