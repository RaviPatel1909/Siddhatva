import React from 'react';
import { Helmet } from 'react-helmet-async';

export const SITE_NAME = 'Siddhatva';
const DEFAULT_TITLE = `${SITE_NAME} | Luxe Minimalist Editorial Fashion`;
const DEFAULT_DESCRIPTION =
  'Luxe minimalist editorial fashion — bronze, blush and champagne essentials crafted with intention. Shop the Siddhatva collection.';

interface SeoProps {
  /** Page title; the brand is appended unless the title already contains it. */
  title?: string;
  /** Meta/OG description — kept ≤160 chars, accurate to the page (no stuffing). */
  description?: string;
  /** Absolute OG/Twitter image URL (e.g. the hero or a product image). */
  image?: string;
  /** Canonical path; defaults to the current location's pathname. */
  canonicalPath?: string;
  /** Forms/private pages set this so search engines don't index them. */
  noindex?: boolean;
  ogType?: 'website' | 'product' | 'article';
}

// One place that emits page <title>, meta description, canonical, and Open Graph /
// Twitter tags. Every page renders a <Seo>; react-helmet-async dedupes so the
// last-mounted route wins. Descriptions are truncated to a sane 160 chars.
export const Seo: React.FC<SeoProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  canonicalPath,
  noindex = false,
  ogType = 'website',
}) => {
  const fullTitle = !title ? DEFAULT_TITLE : title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = canonicalPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const canonical = `${origin}${path}`;
  const desc = description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      {image ? <meta property="og:image" content={image} /> : <></>}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image ? <meta name="twitter:image" content={image} /> : <></>}
    </Helmet>
  );
};

interface ProductJsonLdProps {
  name: string;
  description: string;
  image: string;
  price: number; // INR whole rupees
  sku?: string;
  category?: string;
}

// schema.org/Product structured data for rich results. Rating is a placeholder
// until real reviews are wired (the Review model exists in the schema).
export const ProductJsonLd: React.FC<ProductJsonLdProps> = ({
  name,
  description,
  image,
  price,
  sku,
  category,
}) => {
  const data = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name,
    description,
    image: [image],
    ...(sku ? { sku } : {}),
    ...(category ? { category } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: String(price),
      availability: 'https://schema.org/InStock',
    },
    // Placeholder rating — replace with aggregates from the Review model.
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '24' },
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
};
