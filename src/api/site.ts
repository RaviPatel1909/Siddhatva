import { apiFetch } from './client';

export interface HeroContent {
  image: string;
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}
export interface PhilosophyContent {
  image: string;
  heading: string;
  body: string;
}
export interface CollectionCard {
  image: string;
  label: string;
  href: string;
}
export interface NewsletterContent {
  heading: string;
  subtext: string;
}
export interface HomeContent {
  hero: HeroContent;
  philosophy: PhilosophyContent;
  collectionCards: CollectionCard[];
  newsletter: NewsletterContent;
}

// GET /site/home — public home content.
export const getHomeContent = (): Promise<HomeContent> => apiFetch<HomeContent>('/site/home');

// PATCH /admin/site/home — replace the home content (ADMIN).
export const updateHomeContent = (content: HomeContent): Promise<HomeContent> =>
  apiFetch<HomeContent>('/admin/site/home', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
