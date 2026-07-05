import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { CheckoutLayout } from '../components/layout/CheckoutLayout';
import { OrderSummaryCard } from '../components/cart/OrderSummaryCard';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { queryKeys } from '../api/queryKeys';

type Step = 'information' | 'shipping' | 'payment';
const STEP_LABELS = ['Cart', 'Information', 'Shipping', 'Payment'];
const STEP_INDEX: Record<Step, number> = { information: 1, shipping: 2, payment: 3 };

// Version-safe validation (regex email avoids zod major-version API churn).
const checkoutSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email'),
  marketingOptIn: z.boolean().optional(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  apartment: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  zip: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Select a country'),
  cardName: z.string().min(1, 'Required'),
  cardNumber: z.string().regex(/^\d{4} ?\d{4} ?\d{4} ?\d{4}$/, 'Enter a 16-digit card number'),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, 'MM/YY'),
  cvc: z.string().regex(/^\d{3,4}$/, '3 or 4 digits'),
});
type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const STEP_FIELDS: Record<Step, (keyof CheckoutFormValues)[]> = {
  information: ['email', 'marketingOptIn'],
  shipping: ['firstName', 'lastName', 'address', 'apartment', 'city', 'state', 'zip', 'country'],
  payment: ['cardName', 'cardNumber', 'expiry', 'cvc'],
};

// --- MOCK PAYMENT SEAM ------------------------------------------------------
// No real gateway yet. A later phase replaces this with a real payment intent
// (e.g. create + confirm a Stripe PaymentIntent); on success, continue to
// order creation exactly as below. Keep this the single place payment happens.
const processPayment = async (): Promise<{ ok: boolean }> => {
  return { ok: true };
};
// ---------------------------------------------------------------------------

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass = 'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const CheckoutShippingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, subtotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const [step, setStep] = useState<Step>('information');

  const shipping = subtotal > 500 || subtotal === 0 ? 0 : 15;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const {
    register,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: { marketingOptIn: false },
  });

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    setStep(step === 'information' ? 'shipping' : 'payment');
  };

  const goBack = () => {
    if (step === 'information') navigate('/cart');
    else setStep(step === 'payment' ? 'shipping' : 'information');
  };

  const onPlaceOrder = handleSubmit(async (values) => {
    const payment = await processPayment();
    if (!payment.ok) return;
    const order = await placeOrder({
      items,
      totals: { subtotal, shipping, tax, total },
      customerName: `${values.firstName} ${values.lastName}`,
      shippingAddress: {
        name: `${values.firstName} ${values.lastName}`,
        line1: values.apartment ? `${values.address}, ${values.apartment}` : values.address,
        city: values.city,
        state: values.state,
        zip: values.zip,
        country: values.country,
      },
    });
    clearCart();
    // The orders query (My Orders) is served from the persisted store; refetch it.
    queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    navigate('/order-confirmed', { state: { orderId: order.id } });
  });

  if (items.length === 0) {
    return (
      <CheckoutLayout>
        <div className="max-w-3xl mx-auto px-margin-mobile py-24 text-center">
          <h1 className="font-display text-headline-lg text-primary mb-md">Your bag is empty</h1>
          <p className="text-on-surface-variant mb-lg">Add pieces to your bag before checking out.</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </CheckoutLayout>
    );
  }

  const currentIndex = STEP_INDEX[step];

  const FieldError = ({ name }: { name: keyof CheckoutFormValues }) =>
    errors[name] ? <p className="text-xs text-danger mt-xs">{errors[name]?.message as string}</p> : null;

  return (
    <CheckoutLayout>
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        {/* Progress tracker reflects the current step */}
        <div className="flex items-center justify-center gap-sm mb-xl">
          {STEP_LABELS.map((label, index) => (
            <React.Fragment key={label}>
              {index > 0 && <span className="material-symbols-outlined text-outline text-[16px]">chevron_right</span>}
              <span
                className={`font-label-sm text-label-sm uppercase tracking-widest ${
                  index === currentIndex
                    ? 'text-primary font-bold border-b-2 border-primary pb-1'
                    : index < currentIndex
                      ? 'text-on-surface-variant'
                      : 'text-on-surface-variant/40'
                }`}
              >
                {label}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <form onSubmit={onPlaceOrder} className="lg:col-span-8 space-y-xl" noValidate>
            {step === 'information' && (
              <div>
                <h2 className="font-display text-headline-md text-primary mb-md">Contact Information</h2>
                <div className="space-y-md">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input type="email" className={inputClass} placeholder="you@example.com" {...register('email')} />
                    <FieldError name="email" />
                  </div>
                  <label className="flex items-center gap-xs text-sm text-on-surface-variant">
                    <input type="checkbox" className="accent-primary" {...register('marketingOptIn')} />
                    Keep me updated with atelier news and early access
                  </label>
                </div>
              </div>
            )}

            {step === 'shipping' && (
              <div>
                <h2 className="font-display text-headline-md text-primary mb-md">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div>
                    <label className={labelClass}>First Name</label>
                    <input className={inputClass} {...register('firstName')} />
                    <FieldError name="firstName" />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <input className={inputClass} {...register('lastName')} />
                    <FieldError name="lastName" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Address</label>
                    <input className={inputClass} {...register('address')} />
                    <FieldError name="address" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Apartment, suite, etc. (optional)</label>
                    <input className={inputClass} {...register('apartment')} />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input className={inputClass} {...register('city')} />
                    <FieldError name="city" />
                  </div>
                  <div>
                    <label className={labelClass}>State / Province</label>
                    <input className={inputClass} {...register('state')} />
                    <FieldError name="state" />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP / Postal Code</label>
                    <input className={inputClass} {...register('zip')} />
                    <FieldError name="zip" />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <select className={inputClass} defaultValue="" {...register('country')}>
                      <option value="" disabled>Select a country</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>France</option>
                      <option>Italy</option>
                    </select>
                    <FieldError name="country" />
                  </div>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div>
                <h2 className="font-display text-headline-md text-primary mb-md">Payment</h2>
                <p className="text-xs text-on-surface-variant mb-md italic">
                  Demo checkout — no real payment is processed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Name on Card</label>
                    <input className={inputClass} {...register('cardName')} />
                    <FieldError name="cardName" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Card Number</label>
                    <input className={inputClass} placeholder="4242 4242 4242 4242" {...register('cardNumber')} />
                    <FieldError name="cardNumber" />
                  </div>
                  <div>
                    <label className={labelClass}>Expiry (MM/YY)</label>
                    <input className={inputClass} placeholder="12/28" {...register('expiry')} />
                    <FieldError name="expiry" />
                  </div>
                  <div>
                    <label className={labelClass}>CVC</label>
                    <input className={inputClass} placeholder="123" {...register('cvc')} />
                    <FieldError name="cvc" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-md">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-2 text-primary font-label-sm text-sm uppercase tracking-widest hover:-translate-x-1 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                {step === 'information' ? 'Return to cart' : 'Back'}
              </button>
              {step === 'payment' ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                  Pay ${total.toFixed(2)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all active:scale-95"
                >
                  {step === 'information' ? 'Continue to Shipping' : 'Continue to Payment'}
                </button>
              )}
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
