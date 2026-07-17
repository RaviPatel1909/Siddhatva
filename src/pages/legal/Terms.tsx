/* DRAFT: AI-generated starting point — replace with reviewed business/legal content
   (or Razorpay's policy-page generator) before relying on this. */
import React from 'react';
import { PolicyPage, PolicySection } from '../../components/legal/PolicyPage';

export const TermsPage: React.FC = () => (
  <PolicyPage
    title="Terms & Conditions"
    description="The terms governing your use of the Siddhatva online store — orders, payments, accounts, intellectual property, and liability."
    canonicalPath="/terms"
    lastUpdated="17 July 2026"
    draft
  >
    <PolicySection heading="Introduction">
      <p>
        These Terms &amp; Conditions govern your access to and use of the Siddhatva
        website and your purchase of products from our online store. By browsing the
        site or placing an order, you agree to these terms. If you do not agree, please
        do not use the site.
      </p>
    </PolicySection>

    <PolicySection heading="Orders">
      <p>
        When you place an order, you make an offer to purchase the selected products
        subject to these terms. All orders are subject to acceptance and product
        availability. We may decline or cancel an order — for example, where an item is
        out of stock, where there is a pricing or description error, or where we suspect
        fraudulent or unauthorised activity. Where an accepted order is cancelled by us,
        any amount paid for it is refunded.
      </p>
    </PolicySection>

    <PolicySection heading="Payments">
      <p>
        Payments are processed securely through our payment partner, Razorpay. All
        prices and charges are in Indian Rupees (INR). By submitting payment details you
        confirm that you are authorised to use the chosen payment method. Your order is
        confirmed once payment is successfully authorised and captured. We do not store
        your full card or banking details on our servers.
      </p>
    </PolicySection>

    <PolicySection heading="User accounts">
      <p>
        You may create an account to place orders and manage your purchases. You are
        responsible for keeping your account credentials confidential and for all
        activity that occurs under your account. Please provide accurate and current
        information, and notify us promptly of any unauthorised use. We may suspend or
        terminate accounts that violate these terms.
      </p>
    </PolicySection>

    <PolicySection heading="Intellectual property">
      <p>
        All content on this site — including the Siddhatva name and logo, product
        images, text, graphics, and page design — is owned by or licensed to Siddhatva
        and is protected by applicable intellectual property laws. You may not copy,
        reproduce, distribute, or use any of this content for commercial purposes
        without our prior written permission.
      </p>
    </PolicySection>

    <PolicySection heading="Limitation of liability">
      <p>
        Our products and website are provided on a reasonable-efforts basis. To the
        extent permitted by law, Siddhatva is not liable for indirect or consequential
        losses arising from your use of the site or products. Nothing in these terms
        limits any rights you have under applicable Indian consumer-protection law.
      </p>
    </PolicySection>

    <PolicySection heading="Governing law">
      <p>
        These terms are governed by the laws of India, and any disputes are subject to
        the jurisdiction of the courts at [Jurisdiction city to be updated]. We may
        update these terms from time to time; the version published on this page at the
        time of your order applies to that order.
      </p>
    </PolicySection>

    <PolicySection heading="Contact">
      <p>
        Questions about these terms? Email us at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>
        .
      </p>
    </PolicySection>
  </PolicyPage>
);
