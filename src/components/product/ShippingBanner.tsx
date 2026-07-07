import React from 'react';
 
// ============================================================================
// 1. SHIPPING BANNER
// ============================================================================
 
interface ShippingBannerProps {
  message?: string;
  className?: string;
}
 
export const ShippingBanner: React.FC<ShippingBannerProps> = ({
  message = 'Complimentary shipping on orders over ₹500',
  className = '',
}) => (
  <div
    className={`w-full bg-secondary text-on-secondary py-2 text-center 
                font-label-sm text-label-sm uppercase tracking-widest ${className}`}
  >
    {message}
  </div>
);