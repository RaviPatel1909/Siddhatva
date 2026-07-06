// Fixed-slot home page content. DEFAULT_HOME_CONTENT is extracted verbatim from
// the current hardcoded home page so the seeded DB reproduces it exactly.

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
  collectionCards: CollectionCard[]; // exactly 3
  newsletter: NewsletterContent;
}

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBeF9XmMBdUn8qsSL9k0cLWgm7vXK77hXF7wE7bn1pt6GY2qxh7w-OJg7NBzl37MmkzU7V1aiy05FD-wbuL1QIby6GPSeXkfbInX0kGgicNJdxL0GdqMd5MTt7OI1PBV2d32OgRwFwy1P9Cs2PCQMj0FFdRVeuCCHOfbdogLZkdtlvGZ3tFKMNeEVsc6-wu7QDA3bLEP7so7aR8RKuvjCAPxypXpNmd_KLG0NR3oN5SshmDI-GHL5QVzAJ6NJfcItwz83O-10DekuWT';
const PHILOSOPHY_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAcGIlQnsdPnS77dayPtlQUr_fzXCPrZoCOk17I2Seh2ONtBX9JV2TvJ6jvbdVF8jSUIx37aAPkiQgf1AHsMiTwrMPrXK8j7uNDZzl2BZL4eu9wkGM1JvvKf82LbVvPbAlP0tWuzItRfY4jnj3C6UTrEtCZcSJG3xW4Ytm6rMEKBx0saf2D8MhSrFXb7m4TDkuSlub2QFRcByjhazilMwdbZYin0tT4XUubZvIo4OOeQ0kiarvsWZjI97x3tETo_GoRJzfZJW3ig0Zj';
const MEN_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCCHtPgOhJdYnkSW_RkAWN8a4VIE91L3snr7DOCXQpXMxvAFkFnr38eIrb3ynpAfMDCgg1mPMCeYHiPtnlzOl8_jY8Kwpj-yXMoDilmyW4e9RNeYhMJm9DrWsJYIJAlKAZ0z50hnFCG6tuiVivZUs71b6i_W6wla7qeq6NY_GyjAMeJDCsuWFgppKSXEJpkjVhhHYym8EtXS0RFL6XwpBeB7eX88JixaL7VGs838o9ldg4MyW_bmsTW0x3sAWJObPNZP2Ric9kMwux7';
const WOMEN_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCHanRN7G4r36yTq3ceIdN7C9urTwV2dqsTYt0mFduRaDv-eXJZKxHAz_rxhpUrxgjAzK4wObuTeqlA8RN0RR-3ptre2yjAZpc4pN4yk2QB3PQpzFkYCh2KLlECBlc5OF2Wdhky9h8nxpkaPTBa_TJe-4S74FmQaQfdUwOumErse9iD5euo9JIVV48zImqBXtct8tfiXbXiHnidDTJuuE0aFoE7NHfSr6zjggU7fIg-FT7OT_gnCCoGXLCftb0UvSQDVMP_f5SErHZn';
const KIDS_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC7r-vsDyOnZ-rFNORwooLLc3d1kt9_l2Q4ZVn-lycl5WZjNIoUeoXDLJn5jli-ohdAibrlAI-mw1cEb-8SQq2GLrouELdsYOmLBwKsNct1aBu4U2VYM1XJ9wmhBfxsfG7lkjua_rDGNhzDxSF5PF3EmlHmpzq0Kw4TjsLWWRUlFQcMAtg_qPzZdT5D74nKKunlUvvsgxPDiOlhTyQYTKzZMlUpDUusgJ1YOSqlrGgDJakYFBKZuB1nS_rvy_3VGEBBpKCmyLl-Cice';

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    image: HERO_IMAGE,
    headline: 'The Warmth of Silence',
    subheadline: 'Luxe Minimalist Edition',
    primaryCtaLabel: 'Explore Summer 24',
    primaryCtaHref: '/shop',
    secondaryCtaLabel: 'View Lookbook',
    secondaryCtaHref: '#',
  },
  philosophy: {
    image: PHILOSOPHY_IMAGE,
    heading: 'The Art of Intentional Presence.',
    body: 'Siddhatva is a dialogue between the tactile and the timeless. In our Luxe Minimalist collection, we weave the softness of blush with the strength of bronze, creating a sanctuary of style that resonates with the soul.',
  },
  collectionCards: [
    { image: MEN_IMAGE, label: 'Men', href: '/shop/Men' },
    { image: WOMEN_IMAGE, label: 'Women', href: '/shop/Women' },
    { image: KIDS_IMAGE, label: 'Kids', href: '/shop/Kids' },
  ],
  newsletter: {
    heading: 'Experience the Collection First.',
    subtext:
      'Join our inner circle for exclusive access to atelier previews, limited edition drops, and high-fashion editorial insights.',
  },
};

export const HOME_KEY = 'home';
