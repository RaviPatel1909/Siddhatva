/* DRAFT: AI-generated starting point — replace with reviewed business/legal content
   (or Razorpay's policy-page generator) before relying on this. */
import React from 'react';
import { PolicyPage, PolicySection } from '../../components/legal/PolicyPage';

export const PrivacyPage: React.FC = () => (
  <PolicyPage
    title="Privacy Policy"
    description="How Siddhatva collects, uses, and protects your personal information — what we collect, cookies, payments, analytics, security, and your rights."
    canonicalPath="/privacy"
    lastUpdated="17 July 2026"
    draft
  >
    <PolicySection heading="Introduction">
      <p>
        This Privacy Policy explains how Siddhatva collects, uses, discloses, and
        protects your personal information when you use our website and place orders. We
        are committed to handling your data responsibly and in line with applicable
        Indian data-protection law, including the Information Technology Act, 2000 and
        the Digital Personal Data Protection Act, 2023.
      </p>
    </PolicySection>

    <PolicySection heading="Information we collect">
      <p>We collect information you provide and information generated as you use the site, including:</p>
      <ul className="list-disc pl-md space-y-xs">
        <li>Contact and account details — name, email address, and password.</li>
        <li>Order and delivery details — shipping address and order history.</li>
        <li>
          Communications you send us, such as support emails and enquiries.
        </li>
        <li>
          Technical and usage data — device, browser, and how you interact with the
          site.
        </li>
      </ul>
      <p>
        We do not collect or store your full payment-card or banking details — these are
        handled directly by our payment partner (see Payments).
      </p>
    </PolicySection>

    <PolicySection heading="How we use your information">
      <p>
        We use your information to process and deliver your orders, manage your account,
        provide customer support, send order-related communications, improve our
        products and website, prevent fraud, and meet legal obligations. We rely on your
        consent and on legitimate, order-fulfilment purposes for this processing.
      </p>
    </PolicySection>

    <PolicySection heading="Cookies">
      <p>
        Our website uses cookies and similar technologies to keep you signed in, remember
        your cart, and understand how the site is used. You can control or disable cookies
        through your browser settings, though some features of the site may not work
        correctly without them.
      </p>
    </PolicySection>

    <PolicySection heading="Payments">
      <p>
        Payments are processed securely by Razorpay. When you pay, the information needed
        to complete the transaction is shared with and handled by Razorpay under their own
        privacy and security terms. Siddhatva does not receive or store your full card,
        UPI, or bank credentials.
      </p>
    </PolicySection>

    <PolicySection heading="Analytics">
      <p>
        We may use analytics tools to understand aggregate, anonymised usage — for
        example, which pages are visited and how customers move through checkout — so we
        can improve the shopping experience. This data is used in aggregate and is not
        used to identify you personally.
      </p>
    </PolicySection>

    <PolicySection heading="Data sharing">
      <p>
        We share personal information only as needed to run the store — for example, with
        courier partners to deliver your order, our payment partner to process payments,
        and service providers who support our operations. We do not sell your personal
        information. We may disclose information where required by law or to protect our
        rights.
      </p>
    </PolicySection>

    <PolicySection heading="Security">
      <p>
        We use reasonable technical and organisational measures to protect your
        information, including encrypted connections and access controls. No method of
        transmission or storage is completely secure, but we work to safeguard your data
        and to limit access to it.
      </p>
    </PolicySection>

    <PolicySection heading="Your rights">
      <p>
        Subject to applicable law, you may request access to the personal information we
        hold about you, ask us to correct or update it, or request its deletion. You may
        also close your account. To exercise any of these rights, email us at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>
        , and we will respond in line with applicable law.
      </p>
    </PolicySection>

    <PolicySection heading="Changes and contact">
      <p>
        We may update this policy from time to time; the current version is always
        published on this page. For any privacy questions or requests, contact us at{' '}
        <a href="mailto:support@siddhatva.in" className="text-primary hover:underline">
          support@siddhatva.in
        </a>
        .
      </p>
    </PolicySection>
  </PolicyPage>
);
