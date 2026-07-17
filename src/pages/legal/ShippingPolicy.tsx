import React from 'react';
import { PolicyPage, PolicySection } from '../../components/legal/PolicyPage';

export const ShippingPolicyPage: React.FC = () => (
  <PolicyPage
    title="Shipping Policy"
    description="How Siddhatva ships across India — processing times, delivery estimates, order tracking, and what happens if there's a delay."
    canonicalPath="/shipping-policy"
    lastUpdated="17 July 2026"
  >
    <PolicySection heading="Where we ship">
      <p>
        Siddhatva currently ships within India only. We deliver to serviceable
        pincodes across the country. Orders with a delivery address outside India
        cannot be processed at this time.
      </p>
    </PolicySection>

    <PolicySection heading="Order processing">
      <p>
        Orders are processed on business days (Monday to Saturday, excluding public
        holidays). Most orders are packed and dispatched within 1–3 business days of
        payment confirmation. During sale periods, new launches, or peak seasons,
        processing may take slightly longer.
      </p>
    </PolicySection>

    <PolicySection heading="Delivery estimates">
      <p>
        Once dispatched, delivery typically takes 3–7 business days depending on your
        location. Metro cities are usually delivered faster than remote or non-metro
        areas. Delivery timelines are estimates provided by our courier partners and
        are not guaranteed dates.
      </p>
    </PolicySection>

    <PolicySection heading="Tracking your order">
      <p>
        When your order is dispatched, we email you the tracking details so you can
        follow your shipment. You can also view the current status of your orders from
        your account, under Orders, at any time.
      </p>
    </PolicySection>

    <PolicySection heading="Delays">
      <p>
        Occasionally, deliveries may be delayed due to circumstances outside our
        control — weather, regional disruptions, courier backlogs, or incorrect or
        incomplete address details. If your order is significantly delayed beyond the
        estimated window, email us at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>{' '}
        with your order number and we'll follow up with the courier on your behalf.
      </p>
    </PolicySection>
  </PolicyPage>
);
