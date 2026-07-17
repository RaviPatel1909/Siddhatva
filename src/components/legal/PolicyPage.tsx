import React from 'react';
import { MainLayout } from '../layout/MainLayout';
import { Seo } from '../seo/Seo';
import { Breadcrumb } from '../shared/Breadcrumb';

interface PolicyPageProps {
  /** Page + SEO title (brand is appended by <Seo>). */
  title: string;
  /** Meta description for this page (≤160 chars — <Seo> truncates). */
  description: string;
  /** Canonical path, e.g. "/privacy". */
  canonicalPath: string;
  /** Human-readable last-updated date shown under the title. */
  lastUpdated: string;
  /** When set, renders the "working draft" notice (legal pages only). */
  draft?: boolean;
  children: React.ReactNode;
}

// Shared shell for the footer compliance pages — both the legal policies (Terms,
// Privacy, Refund) and the factual info pages (Contact, Shipping, Pricing). Provides
// the layout, SEO, breadcrumb, page title + last-updated line, a centered readable
// column, and (optionally) the draft banner. These pages are real content, so <Seo>
// keeps its default indexable behaviour — no noindex here.
export const PolicyPage: React.FC<PolicyPageProps> = ({
  title,
  description,
  canonicalPath,
  lastUpdated,
  draft = false,
  children,
}) => (
  <MainLayout>
    <Seo title={title} description={description} canonicalPath={canonicalPath} ogType="article" />
    <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: title }]} />

      <article className="max-w-3xl mx-auto">
        <header>
          <h1 className="font-display text-headline-lg text-on-surface">{title}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Last updated: {lastUpdated}
          </p>
        </header>

        {draft && (
          <div className="mt-lg flex items-start gap-sm rounded-xl border border-outline-variant bg-surface-container-low px-md py-md">
            <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
              info
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant italic">
              This policy is a working draft pending final review. It should not be
              relied upon until it has been reviewed and approved for Siddhatva.
            </p>
          </div>
        )}

        <div className="mt-xl space-y-xl">{children}</div>
      </article>
    </div>
  </MainLayout>
);

// A titled content section — keeps heading style + spacing consistent across all six
// pages. Body text is on-surface-variant for comfortable long-form reading.
export const PolicySection: React.FC<{ heading: string; children: React.ReactNode }> = ({
  heading,
  children,
}) => (
  <section className="space-y-sm">
    <h2 className="font-display text-headline-md text-on-surface">{heading}</h2>
    <div className="font-body-md text-body-md text-on-surface-variant space-y-sm">{children}</div>
  </section>
);
