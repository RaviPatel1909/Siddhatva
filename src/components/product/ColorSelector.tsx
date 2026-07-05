import React from 'react';

// ============================================================================
// 4. COLOR SELECTOR
// ============================================================================

export interface Color {
  name: string;
  hex: string;
  id: string;
}

interface ColorSelectorProps {
  colors: Color[];
  onSelect?: (color: Color) => void;
  selectedId?: string;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  colors,
  onSelect,
  selectedId,
}) => (
  <div>
    <label className="font-label-sm text-label-sm text-on-surface uppercase tracking-widest block mb-sm">
      Color
    </label>
    <div className="flex gap-md flex-wrap">
      {colors.map((color) => (
        <button
          key={color.id}
          onClick={() => onSelect?.(color)}
          className={`w-10 h-10 rounded-full border-2 transition-all 
                      focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        selectedId === color.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-outline-variant hover:border-primary'
                      }`}
          style={{ backgroundColor: color.hex }}
          title={color.name}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  </div>
);
