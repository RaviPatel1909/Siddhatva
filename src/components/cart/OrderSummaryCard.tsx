import React, { useState } from 'react';

interface OrderSummaryCardProps {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  showDiscountInput?: boolean;
  ctaLabel?: string;
  onCta?: () => void;
  note?: React.ReactNode;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  subtotal,
  shipping,
  tax,
  total,
  showDiscountInput = false,
  ctaLabel,
  onCta,
  note,
}) => {
  const [discountCode, setDiscountCode] = useState('');

  return (
    <div className="bg-surface-container-low p-lg md:p-xl rounded-lg border border-outline-variant/30 sticky top-24">
      <h2 className="font-display text-headline-md text-primary uppercase tracking-widest mb-lg border-b border-primary/20 pb-md">
        Order Summary
      </h2>
      <div className="space-y-sm mb-lg">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant uppercase tracking-wider">Subtotal</span>
          <span className="text-on-surface font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant uppercase tracking-wider">Shipping</span>
          <span className="text-primary font-medium italic">
            {shipping === 0 ? 'Complimentary' : `$${shipping.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant uppercase tracking-wider">Taxes</span>
          <span className="text-on-surface font-medium">${tax.toFixed(2)}</span>
        </div>
      </div>

      {showDiscountInput && (
        <div className="flex items-stretch gap-sm w-full min-w-0 mb-lg">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="Discount code"
            className="flex-1 min-w-0 bg-surface border border-outline-variant rounded-lg px-sm py-xs text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <button className="shrink-0 whitespace-nowrap px-5 py-xs border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors">
            Apply
          </button>
        </div>
      )}

      <div className="pt-md border-t border-primary/20 mb-lg">
        <div className="flex justify-between items-end">
          <span className="text-sm font-medium uppercase tracking-widest text-on-surface-variant">Total</span>
          <div className="text-right">
            <span className="text-3xl font-display text-primary">${total.toFixed(2)}</span>
            <p className="text-[10px] text-on-surface-variant mt-1 italic">Taxes and duties included</p>
          </div>
        </div>
      </div>

      {ctaLabel && (
        <button
          onClick={onCta}
          className="w-full bg-primary text-on-primary py-md rounded-lg font-label-sm text-sm uppercase
                    tracking-widest font-semibold hover:opacity-90 transition-all duration-300
                    active:scale-[0.98] mb-md flex items-center justify-center gap-2 group"
        >
          {ctaLabel}
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
      )}

      <p className="text-[10px] text-on-surface-variant/70 text-center uppercase tracking-widest">
        Safe &amp; Encrypted Payment
      </p>

      {note && <div className="mt-lg pt-lg border-t border-outline-variant/30">{note}</div>}
    </div>
  );
};
