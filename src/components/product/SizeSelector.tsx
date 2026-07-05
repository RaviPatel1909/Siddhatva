import React from 'react';
// ============================================================================
// 5. SIZE SELECTOR
// ============================================================================

interface SizeSelectorProps {
  sizes?: string[];
  onSelect?: (size: string) => void;
  selectedSize?: string;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  onSelect,
  selectedSize = 'M',
}) => (
  <div>
    <label className="font-label-sm text-label-sm text-on-surface uppercase tracking-widest block mb-sm">
      Size
    </label>
    <div className="grid grid-cols-4 gap-sm">
      {sizes.map((size) => (
        <button
          key={size}
          onClick={() => onSelect?.(size)}
          className={`py-md border rounded font-label-sm uppercase tracking-widest 
                      transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        selectedSize === size
                          ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                          : 'border border-outline-variant text-on-surface hover:border-primary'
                      }`}
          aria-pressed={selectedSize === size}
        >
          {size}
        </button>
      ))}
    </div>
  </div>
);