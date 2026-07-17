import React from 'react';
import { PolicyPage, PolicySection } from '../../components/legal/PolicyPage';

export const ContactPage: React.FC = () => (
  <PolicyPage
    title="Contact Us"
    description="Get in touch with the Siddhatva team — email support, business hours, response times, and our registered address."
    canonicalPath="/contact"
    lastUpdated="17 July 2026"
  >
    <PolicySection heading="Get in touch">
      <p>
        We're here to help with questions about your order, our products, shipping,
        returns, or anything else about shopping with Siddhatva. The fastest way to
        reach us is by email, and we read every message.
      </p>
    </PolicySection>

    <PolicySection heading="Email">
      <p>
        For all enquiries — orders, payments, shipping, and returns — email us at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>
        . Please include your order number where relevant so we can help you faster.
      </p>
    </PolicySection>

    <PolicySection heading="Business hours">
      <p>
        Our support team is available Monday to Saturday, 10:00 AM to 6:00 PM IST.
        We are closed on Sundays and public holidays. Emails received outside these
        hours are answered on the next working day.
      </p>
    </PolicySection>

    <PolicySection heading="Response time">
      <p>
        We aim to respond to all email enquiries within 1–2 business days. During sale
        periods and around public holidays, responses may take a little longer — thank
        you for your patience.
      </p>
    </PolicySection>

    <PolicySection heading="Registered address">
      <p>
        Siddhatva
        <br />
        [Business address to be updated]
      </p>
      <p>
        Siddhatva is an online fashion store serving customers across India. Our
        registered business address will be published here once finalised.
      </p>
    </PolicySection>
  </PolicyPage>
);
