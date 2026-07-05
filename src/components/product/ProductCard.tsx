import React from 'react';
import { Badge } from '../ui/Badge';
import { ProductBadge } from '../../types/product';

// ============================================================================
// 9. PRODUCT CARD (For grids like "Complete the Look")
// ============================================================================

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  imageAlt: string;
  category?: string;
  subtitle?: string;
  badge?: ProductBadge;
  soldOut?: boolean;
  onAddToCart?: () => void;
  onViewDetails?: () => void;
}

const BADGE_LABELS: Record<ProductBadge, string> = {
  new: 'New',
  limited: 'Limited',
  'sold-out': 'Sold Out',
};

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  imageAlt,
  category,
  subtitle,
  badge,
  soldOut,
  onAddToCart,
  onViewDetails,
}) => (
  <div className="flex flex-col gap-sm group cursor-pointer" onClick={onViewDetails}>
    {/* Product Image */}
    <div
      className="aspect-[3/4] bg-surface-container-low rounded-lg
                 overflow-hidden bronze-shadow transition-transform
                 duration-500 group-hover:scale-[1.02] relative"
    >
      <img
        src={image}
        alt={imageAlt}
        className={`w-full h-full object-cover ${soldOut ? 'grayscale opacity-70' : ''}`}
      />

      {badge && (
        <span className="absolute top-md left-md z-10">
          <Badge variant={badge}>{BADGE_LABELS[badge]}</Badge>
        </span>
      )}

      {/* Quick Add Button (shown on hover), or Notify Me if sold out */}
      <div
        className="absolute bottom-md left-1/2 -translate-x-1/2 w-[calc(100%-32px)]
                   opacity-0 group-hover:opacity-100 translate-y-4
                   group-hover:translate-y-0 transition-all duration-300 z-10"
      >
        {soldOut ? (
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-surface text-on-surface font-label-sm py-md
                      rounded uppercase tracking-widest border border-outline-variant
                      hover:bg-surface-container-high transition-colors duration-200 active:scale-95"
          >
            Notify Me
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.();
            }}
            className="w-full bg-primary text-on-primary font-label-sm py-md
                      rounded uppercase tracking-widest hover:opacity-90
                      transition-opacity duration-200 active:scale-95"
          >
            Quick Add
          </button>
        )}
      </div>
    </div>

    {/* Product Info */}
    <div className="flex flex-col">
      {category && (
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          {category}
        </p>
      )}
      <h3
        className="font-body-md text-body-md text-on-surface
                  group-hover:text-primary transition-colors"
      >
        {name}
      </h3>
      {subtitle && (
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">{subtitle}</p>
      )}
      <p className="font-body-md text-body-md font-semibold mt-xs text-primary">
        ${price.toFixed(2)}
      </p>
    </div>
  </div>
);
