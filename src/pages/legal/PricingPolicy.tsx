import React from 'react';
import { PolicyPage, PolicySection } from '../../components/legal/PolicyPage';

export const PricingPolicyPage: React.FC = () => (
  <PolicyPage
    title="Pricing Policy"
    description="How Siddhatva prices its products — INR pricing, taxes, shipping charges shown at checkout, and how prices and promotions may change."
    canonicalPath="/pricing-policy"
    lastUpdated="17 July 2026"
  >
    <PolicySection heading="Currency and pricing">
      <p>
        All prices on Siddhatva are listed and charged in Indian Rupees (INR, ₹).
        Prices shown on product pages are per item unless stated otherwise.
      </p>
    </PolicySection>

    <PolicySection heading="Taxes and GST">
      <p>
        Applicable taxes, including Goods and Services Tax (GST), are included in the
        product price displayed unless explicitly stated otherwise at checkout. The
        final tax breakdown, where applicable, is shown in your order summary before
        you confirm payment.
      </p>
    </PolicySection>

    <PolicySection heading="Shipping charges">
      <p>
        Shipping charges, if any, are calculated and displayed during checkout before
        you complete your payment. You will always see the total payable amount —
        product price plus any shipping and taxes — before confirming your order.
      </p>
    </PolicySection>

    <PolicySection heading="Price changes">
      <p>
        Prices are subject to change without prior notice. The price applicable to your
        order is the price displayed at the time you place and pay for that order. A
        price change after your purchase does not affect an order that has already been
        confirmed.
      </p>
    </PolicySection>

    <PolicySection heading="Promotions and offers">
      <p>
        From time to time we may run promotions, discounts, or offers. These may be
        available for a limited duration, may apply only to selected products, and may
        be subject to additional terms. Offers cannot be combined unless expressly
        stated, and we reserve the right to modify or withdraw a promotion at any time.
      </p>
    </PolicySection>

    <PolicySection heading="Errors">
      <p>
        While we take care to price products accurately, occasional errors may occur.
        If we identify a pricing error on an item in your order, we will contact you at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>{' '}
        with the option to proceed at the correct price or cancel the order for a full
        refund.
      </p>
    </PolicySection>
  </PolicyPage>
);
