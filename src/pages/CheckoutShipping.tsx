import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { CheckoutLayout } from '../components/layout/CheckoutLayout';
import { OrderSummaryCard } from '../components/cart/OrderSummaryCard';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { queryKeys } from '../api/queryKeys';
import { collectPayment, payInit, verifyPayment } from '../api/payments';

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
});
type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// Card details are collected securely by Razorpay Checkout, not this form.
const STEP_FIELDS: Record<Step, (keyof CheckoutFormValues)[]> = {
  information: ['email', 'marketingOptIn'],
  shipping: ['firstName', 'lastName', 'address', 'apartment', 'city', 'state', 'zip', 'country'],
  payment: [],
};

const inputClass =
  'w-full bg-surface border border-outline-variant rounded-lg px-md py-sm font-body-md text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';
const labelClass = 'font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant block mb-xs';

export const CheckoutShippingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, subtotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('information');
  // The PENDING order is created once, then reused across payment retries.
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

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

  // Order-first payment flow: create the order (PENDING), open Razorpay Checkout
  // (or the mock), verify server-side, then confirm. The webhook is authoritative;
  // this gives instant confirmation. On dismiss/failure the cart + order stay so
  // the user can retry.
  const onPlaceOrder = handleSubmit(async (values) => {
    setPayError(null);
    try {
      let orderId = createdOrderId;
      if (!orderId) {
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
        orderId = order.id;
        setCreatedOrderId(orderId);
      }

      const init = await payInit(orderId);
      const result = await collectPayment(orderId, init, {
        name: `${values.firstName} ${values.lastName}`,
        email: values.email,
      });
      await verifyPayment(result);

      clearCart();
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      navigate('/order-confirmed', { state: { orderId } });
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : 'Payment could not be completed. Please try again.'
      );
    }
  });

  // Placing an order requires an account (POST /orders is authenticated).
  // Send guests to login and back; logging in also merges their guest cart.
  if (!authLoading && !user) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/checkout' } }} />;
  }

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
          <form onSubmit={(e) => e.preventDefault()} className="lg:col-span-8 space-y-xl" noValidate>
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
                <div className="bg-surface-container-low rounded-lg border border-outline-variant/30 p-lg flex items-start gap-md">
                  <span className="material-symbols-outlined text-primary">lock</span>
                  <div>
                    <p className="text-sm text-on-surface font-medium">Secure payment via Razorpay</p>
                    <p className="text-xs text-on-surface-variant mt-xs">
                      Card, UPI, and netbanking are handled in Razorpay&apos;s secure window — we
                      never see your card details. Your order is confirmed only after the payment is
                      verified.
                    </p>
                  </div>
                </div>
                {payError && (
                  <div role="alert" className="mt-md rounded-lg bg-danger/10 border border-danger/30 px-md py-sm text-sm text-danger">
                    {payError}
                  </div>
                )}
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
                  type="button"
                  onClick={onPlaceOrder}
                  disabled={isSubmitting}
                  className="bg-primary text-on-primary px-xl py-md rounded-lg font-label-sm text-sm uppercase tracking-widest font-semibold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing…' : `Pay $${total.toFixed(2)}`}
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
