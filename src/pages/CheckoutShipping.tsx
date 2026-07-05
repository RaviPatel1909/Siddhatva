import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutLayout } from '../components/layout/CheckoutLayout';
import { OrderSummaryCard } from '../components/cart/OrderSummaryCard';
import { useCart } from '../context/CartContext';

const STEPS = ['Cart', 'Information', 'Shipping', 'Payment'];
const ACTIVE_STEP = 1;

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

const labelClass =
  'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs ' +
  'transition-colors group-focus-within:text-primary';

export const CheckoutShippingPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const shipping = subtotal > 500 || subtotal === 0 ? 0 : 15;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearCart();
    navigate('/order-confirmed');
  };

  return (
    <CheckoutLayout>
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-sm mb-xl">
          {STEPS.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 && <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>}
              <span
                className={`font-label-sm text-label-sm uppercase tracking-widest ${
                  index === ACTIVE_STEP
                    ? 'text-primary font-bold border-b-2 border-primary pb-1'
                    : index < ACTIVE_STEP
                      ? 'text-on-surface-variant'
                      : 'text-on-surface-variant/40'
                }`}
              >
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-xl">
            <div>
              <h2 className="font-display text-headline-md text-primary mb-md">Contact Information</h2>
              <div className="space-y-md">
                <div className="group">
                  <label className={labelClass}>Email Address</label>
                  <input type="email" required className={inputClass} placeholder="you@example.com" />
                </div>
                <label className="flex items-center gap-xs text-sm text-on-surface-variant">
                  <input type="checkbox" className="accent-primary" />
                  Keep me updated with atelier news and early access
                </label>
              </div>
            </div>

            <div>
              <h2 className="font-display text-headline-md text-primary mb-md">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="group">
                  <label className={labelClass}>First Name</label>
                  <input type="text" required className={inputClass} />
                </div>
                <div className="group">
                  <label className={labelClass}>Last Name</label>
                  <input type="text" required className={inputClass} />
                </div>
                <div className="sm:col-span-2 group">
                  <label className={labelClass}>Address</label>
                  <input type="text" required className={inputClass} />
                </div>
                <div className="sm:col-span-2 group">
                  <label className={labelClass}>Apartment, suite, etc. (optional)</label>
                  <input type="text" className={inputClass} />
                </div>
                <div className="group">
                  <label className={labelClass}>City</label>
                  <input type="text" required className={inputClass} />
                </div>
                <div className="group">
                  <label className={labelClass}>State / Province</label>
                  <input type="text" required className={inputClass} />
                </div>
                <div className="group">
                  <label className={labelClass}>ZIP / Postal Code</label>
                  <input type="text" required className={inputClass} />
                </div>
                <div className="group">
                  <label className={labelClass}>Country</label>
                  <select required className={inputClass} defaultValue="">
                    <option value="" disabled>Select a country</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>France</option>
                    <option>Italy</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-md">
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="flex items-center gap-2 text-primary font-label-sm text-sm uppercase tracking-widest hover:-translate-x-1 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Return to cart
              </button>
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
              >
                Place Order
              </button>
            </div>
          </form>

          <div className="lg:col-span-4">
            <div className="bg-surface-container-low rounded-lg border border-outline-variant/30 p-lg mb-lg max-h-72 overflow-y-auto space-y-md">
              {items.map((item) => (
                <div key={item.id} className="flex gap-md items-center">
                  <div className="relative w-16 h-20 rounded-md overflow-hidden bg-surface-container-high shrink-0">
                    <img src={item.product.images[0].src} alt={item.product.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">{item.product.name}</p>
                    <p className="text-xs text-on-surface-variant">{item.color.name} / {item.size}</p>
                  </div>
                  <p className="text-sm font-medium text-primary">${(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <OrderSummaryCard subtotal={subtotal} shipping={shipping} tax={tax} total={total} showDiscountInput />
          </div>
        </div>
      </div>
    </CheckoutLayout>
  );
};
