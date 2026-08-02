import React from 'react';
import { formatPrice } from '../../lib/money';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/pricing';

// ============================================================================
// 1. SHIPPING BANNER
// ============================================================================

interface ShippingBannerProps {
  message?: string;
  className?: string;
}

// Derived from the shared pricing rule, not a hardcoded number, so the promise
// shown to the shopper can never drift from what checkout actually charges.
// "over" mirrors the strict `subtotal > THRESHOLD` comparison in shippingFor().
const defaultMessage = `Complimentary shipping on orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`;

export const ShippingBanner: React.FC<ShippingBannerProps> = ({
  message = defaultMessage,
  className = '',
}) => (
  <div
    className={`w-full bg-secondary text-on-secondary py-2 text-center 
                font-label-sm text-label-sm uppercase tracking-widest ${className}`}
  >
    {message}
  </div>
);