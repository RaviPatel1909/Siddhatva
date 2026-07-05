import React from 'react';
import { QuantitySelector } from '../product/QuantitySelector';

interface CartLineItemProps {
  image: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export const CartLineItem: React.FC<CartLineItemProps> = ({
  image,
  name,
  variant,
  price,
  quantity,
  onQuantityChange,
  onRemove,
}) => (
  <div className="flex flex-col md:flex-row gap-lg pb-xl border-b border-outline-variant/30 group">
    <div className="w-full md:w-48 aspect-[3/4] bg-surface-container-low overflow-hidden rounded-lg shrink-0">
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
    </div>
    <div className="flex-1 flex flex-col justify-between py-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-body-md text-xl font-medium text-on-surface">{name}</h3>
          <p className="text-sm text-on-surface-variant mt-1 italic">{variant}</p>
        </div>
        <span className="text-xl font-light text-primary">${(price * quantity).toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between mt-8">
        <QuantitySelector quantity={quantity} onQuantityChange={onQuantityChange} />
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-on-surface-variant/70 hover:text-error transition-all duration-300 md:opacity-0 md:group-hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          <span className="text-[10px] uppercase tracking-widest font-medium">Remove</span>
        </button>
      </div>
    </div>
  </div>
);
