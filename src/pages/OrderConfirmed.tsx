import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutLayout } from '../components/layout/CheckoutLayout';
import { getProductById } from '../data/products';

const CONFETTI_CLASSES = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-primary-container'];

const CONFIRMED_ITEMS = [
  { product: getProductById('11')!, variant: 'Charcoal Grey / 48', quantity: 1, tag: 'Ethically Sourced' },
  { product: getProductById('6')!, variant: 'Champagne / M', quantity: 1, tag: 'Gift Wrapped' },
];

export const OrderConfirmedPage: React.FC = () => {
  const navigate = useNavigate();
  const [orderNumber] = useState(() => `SID-${Math.floor(10000 + Math.random() * 89999)}`);
  const [confetti] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      colorClass: CONFETTI_CLASSES[i % CONFETTI_CLASSES.length],
    }))
  );

  const subtotal = CONFIRMED_ITEMS.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <CheckoutLayout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-10 h-64">
          {confetti.map((piece, i) => (
            <span
              key={i}
              className={`confetti-piece ${piece.colorClass}`}
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-3xl mx-auto px-margin-mobile py-24 text-center fade-in-up">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-lg">
            <span className="material-symbols-outlined text-5xl text-primary">check_circle</span>
          </div>
          <h1 className="font-display text-headline-lg text-primary mb-md">Thank You for Your Order</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
            Your order has been placed and is being prepared with care by our atelier.
          </p>
          <div className="flex flex-col sm:flex-row gap-md justify-center">
            <button
              onClick={() => navigate('/account/orders')}
              className="bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all active:scale-95"
            >
              View Order Status
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="border border-primary text-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:bg-primary/5 transition-all active:scale-95"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop pb-24 fade-in-up">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-xl bg-surface-container-low rounded-lg border border-outline-variant/30 p-lg">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-xs">Order Number</p>
            <p className="font-body-md text-on-surface font-medium">{orderNumber}</p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-xs">Estimated Delivery</p>
            <p className="font-body-md text-on-surface font-medium">3-5 Business Days</p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-xs">Shipping Method</p>
            <p className="font-body-md text-on-surface font-medium">Complimentary White-Glove</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-8 space-y-md">
            <h2 className="font-display text-headline-md text-primary mb-md">Order Summary</h2>
            {CONFIRMED_ITEMS.map((item) => (
              <div key={item.product.id} className="flex gap-md items-center border-b border-outline-variant/20 pb-md">
                <div className="w-16 h-20 rounded-md overflow-hidden bg-surface-container-high shrink-0">
                  <img src={item.product.images[0].src} alt={item.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-on-surface">{item.product.name}</p>
                  <p className="text-xs text-on-surface-variant">{item.variant} · Qty {item.quantity}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full border border-primary/30 text-primary text-[10px] uppercase tracking-widest font-semibold">
                    {item.tag}
                  </span>
                </div>
                <p className="text-sm font-medium text-primary">${(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 space-y-lg">
            <div className="bg-surface-container-low rounded-lg border border-outline-variant/30 p-lg">
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-md">
                Totals
              </h3>
              <div className="space-y-xs text-sm">
                <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Shipping</span><span className="text-primary italic">Complimentary</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Tax</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold pt-xs border-t border-outline-variant/30 mt-xs">
                  <span>Total</span><span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg border border-outline-variant/30 p-lg">
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-md">
                Shipping To
              </h3>
              <p className="text-sm text-on-surface">24 Bronze Lane</p>
              <p className="text-sm text-on-surface-variant">London, W1K 5QT, United Kingdom</p>
              <p className="text-xs text-on-surface-variant italic mt-sm">Tracking details will be sent soon.</p>
            </div>
            <div className="bg-surface-container-low rounded-lg border border-outline-variant/30 p-lg">
              <div className="flex gap-md">
                <span className="material-symbols-outlined text-primary">support_agent</span>
                <div>
                  <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-xs">
                    Concierge Care
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Questions about your order? Our private concierge is at your service.
                  </p>
                  <button
                    type="button"
                    className="text-sm text-primary font-semibold underline underline-offset-8 mt-xs block hover:opacity-80 transition-opacity"
                  >
                    Contact Concierge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CheckoutLayout>
  );
};
