import React, { useState } from 'react';
import { ColorSelector, type Color } from './ColorSelector';
import { SizeSelector } from './SizeSelector';
import { QuantitySelector } from './QuantitySelector';
import { formatPrice } from '../../lib/money';
// ============================================================================
// 7. PRODUCT DETAILS SECTION
// ============================================================================

interface ProductDetailsProps {
  name: string;
  price: number;
  description: string;
  colors: Color[];
  sizes?: string[];
  onAddToCart?: (data: {
    color: Color;
    size: string;
    quantity: number;
  }) => void;
  isWished?: boolean;
  onToggleWishlist?: () => void;
  rating?: { stars: number; count: number };
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  name,
  price,
  description,
  colors,
  sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  onAddToCart,
  isWished = false,
  onToggleWishlist,
  rating,
}) => {
  const [selectedColor, setSelectedColor] = useState<Color>(colors[0]);
  const [selectedSize, setSelectedSize] = useState(sizes[2]); // Default M
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    onAddToCart?.({
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
  };

  return (
    <div className="space-y-lg">
      {/* Product Title & Price */}
      <div>
        <h1 className="font-display text-headline-lg text-primary mb-md">
          {name}
        </h1>
        <div className="flex items-center gap-md">
          <p className="font-display text-headline-md text-on-surface">
            {formatPrice(price)}
          </p>
          {rating && (
            <div className="flex items-center gap-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">star</span>
              <span className="font-body-md text-body-md">
                {rating.stars} ({rating.count} reviews)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="font-body-md text-body-md text-on-surface-variant">
        {description}
      </p>

      {/* Selectors */}
      <div className="space-y-lg pt-md">
        <ColorSelector
          colors={colors}
          selectedId={selectedColor.id}
          onSelect={setSelectedColor}
        />

        <SizeSelector
          sizes={sizes}
          selectedSize={selectedSize}
          onSelect={setSelectedSize}
        />

        {/* Quantity & Add to Cart */}
        <div className="flex items-center gap-lg pt-md">
          <QuantitySelector
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-primary text-on-primary py-md
                      font-label-sm uppercase tracking-widest rounded
                      hover:opacity-90 transition-opacity duration-300
                      active:scale-95 focus:outline-none focus:ring-2
                      focus:ring-primary/50"
          >
            Add to Cart
          </button>
          <button
            onClick={onToggleWishlist}
            aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWished}
            className="shrink-0 w-12 h-12 flex items-center justify-center rounded border
                      border-outline-variant hover:border-primary transition-colors active:scale-95
                      focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <span
              className={`material-symbols-outlined ${isWished ? 'text-primary' : 'text-on-surface'}`}
              style={{ fontVariationSettings: `'FILL' ${isWished ? 1 : 0}` }}
            >
              favorite
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
