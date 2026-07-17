/* DRAFT: AI-generated starting point — replace with reviewed business/legal content
   (or Razorpay's policy-page generator) before relying on this. */
import React from 'react';
import { PolicyPage, PolicySection } from '../../components/legal/PolicyPage';

export const RefundPolicyPage: React.FC = () => (
  <PolicyPage
    title="Cancellation & Refund Policy"
    description="Siddhatva's cancellation and refund terms — cancelling before dispatch, refund timelines, damaged or wrong items, and non-returnable situations."
    canonicalPath="/refund-policy"
    lastUpdated="17 July 2026"
    draft
  >
    <PolicySection heading="Overview">
      <p>
        We want you to be happy with your purchase. This policy explains when you can
        cancel an order, how refunds work, and what to do if something arrives damaged or
        incorrect. All refunds are made in Indian Rupees (INR) to the original payment
        method via our payment partner, Razorpay.
      </p>
    </PolicySection>

    <PolicySection heading="Cancellation before dispatch">
      <p>
        You can request to cancel an order any time before it is dispatched. Email us at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>{' '}
        with your order number as early as possible. If the order has not yet been
        handed to the courier, we will cancel it and issue a full refund. Once an order
        has been dispatched, it can no longer be cancelled, but the sections below may
        apply.
      </p>
    </PolicySection>

    <PolicySection heading="Refund timeline">
      <p>
        Once a cancellation or return is approved, we initiate your refund to the original
        payment method. Refunds are typically processed within 5–7 business days from
        approval. The time for the amount to reflect in your account depends on your bank
        or payment provider, and may take a few additional business days.
      </p>
    </PolicySection>

    <PolicySection heading="Damaged products">
      <p>
        If your item arrives damaged or defective, contact us within 48 hours of delivery
        with your order number and clear photographs of the product and packaging. Once
        verified, we will arrange a replacement where available, or a full refund if a
        replacement is not possible.
      </p>
    </PolicySection>

    <PolicySection heading="Wrong product">
      <p>
        If you receive an item different from what you ordered, let us know within 48
        hours of delivery with your order number and a photograph of the item received.
        We will arrange to collect the incorrect item and send the correct product, or
        issue a full refund if it is unavailable. You will not bear any cost for our
        error.
      </p>
    </PolicySection>

    <PolicySection heading="Non-returnable situations">
      <p>Refunds or returns may not be available in situations including:</p>
      <ul className="list-disc pl-md space-y-xs">
        <li>Requests made after the applicable reporting window has passed.</li>
        <li>
          Items that have been used, washed, altered, or damaged after delivery.
        </li>
        <li>
          Products returned without original tags, packaging, or proof of purchase.
        </li>
        <li>Items marked as final sale or non-returnable on the product page.</li>
        <li>Change-of-mind requests once an order has been dispatched.</li>
      </ul>
    </PolicySection>

    <PolicySection heading="How to reach us">
      <p>
        For any cancellation, refund, or return request, email{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>{' '}
        with your order number and we'll guide you through the next steps.
      </p>
    </PolicySection>
  </PolicyPage>
);
