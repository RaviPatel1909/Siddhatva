import React from 'react';
// ============================================================================
// 6. QUANTITY SELECTOR
// ============================================================================

interface QuantitySelectorProps {
  quantity?: number;
  onQuantityChange?: (qty: number) => void;
  min?: number;
  max?: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity = 1,
  onQuantityChange,
  min = 1,
  max = 100,
}) => (
  <div className="flex items-center border border-outline-variant rounded-lg">
    <button
      onClick={() => onQuantityChange?.(Math.max(min, quantity - 1))}
      disabled={quantity <= min}
      className="p-sm material-symbols-outlined text-on-surface 
                hover:text-primary disabled:opacity-50 transition-colors"
      aria-label="Decrease quantity"
    >
      remove
    </button>
    <span className="px-lg font-label-sm text-on-surface w-8 text-center">
      {quantity}
    </span>
    <button
      onClick={() => onQuantityChange?.(Math.min(max, quantity + 1))}
      disabled={quantity >= max}
      className="p-sm material-symbols-outlined text-on-surface 
                hover:text-primary disabled:opacity-50 transition-colors"
      aria-label="Increase quantity"
    >
      add
    </button>
  </div>
);