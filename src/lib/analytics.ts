// GA4 analytics — a small typed wrapper so ecommerce events aren't scattered raw
// through components. Everything funnels through track(); if VITE_GA4_ID is unset
// the wrapper is a silent no-op (dev-safe: no gtag script, no console noise).
//
// Consent-ready: a single gate (analytics_storage) is set via Consent Mode. It
// currently defaults to granted (domestic/India, lightweight) but a banner could
// later call setAnalyticsConsent(false) before init, or toggle it at runtime —
// consent isn't hardcoded into the tag.

type GtagCommand = 'js' | 'config' | 'event' | 'consent' | 'set';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (command: GtagCommand, ...args: unknown[]) => void;
  }
}

const GA4_ID = import.meta.env.VITE_GA4_ID;
const enabled = (): boolean => Boolean(GA4_ID);

// Store currency. Prices across the storefront are shown in USD, so analytics
// values are reported in USD for consistency with what the shopper sees.
const CURRENCY = 'USD';

let consentGranted = true; // default; call setAnalyticsConsent(false) before init to withhold
let initialized = false;

// Minimal ecommerce item shape (GA4 recommended-event `items` entries).
export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

function gtag(_command: GtagCommand, ..._args: unknown[]): void {
  window.dataLayer = window.dataLayer || [];
  // gtag pushes the raw `arguments` object (not an array) onto the dataLayer.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

/**
 * Set consent BEFORE init to gate the first config, or at runtime to update it.
 * This is the single hook a future consent banner would drive.
 */
export function setAnalyticsConsent(granted: boolean): void {
  consentGranted = granted;
  if (!enabled() || !initialized) return;
  window.gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

/**
 * Load and configure GA4. No-op when VITE_GA4_ID is unset (dev-safe). Idempotent.
 */
export function initAnalytics(): void {
  if (!enabled() || initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;

  // Consent Mode defaults must be set before config.
  window.gtag('consent', 'default', {
    analytics_storage: consentGranted ? 'granted' : 'denied',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA4_ID as string);
}

function track(event: string, params: Record<string, unknown>): void {
  if (!enabled() || !initialized) return;
  window.gtag('event', event, params);
}

// ---- Ecommerce funnel events (payloads, not just pageviews) ----------------

export function trackViewItem(item: AnalyticsItem): void {
  track('view_item', { currency: CURRENCY, value: item.price, items: [item] });
}

export function trackAddToCart(item: AnalyticsItem): void {
  track('add_to_cart', {
    currency: CURRENCY,
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number): void {
  track('begin_checkout', { currency: CURRENCY, value, items });
}

export interface PurchasePayload {
  transactionId: string;
  value: number;
  tax: number;
  shipping: number;
  items: AnalyticsItem[];
}

export function trackPurchase(p: PurchasePayload): void {
  track('purchase', {
    transaction_id: p.transactionId,
    currency: CURRENCY,
    value: p.value,
    tax: p.tax,
    shipping: p.shipping,
    items: p.items,
  });
}
