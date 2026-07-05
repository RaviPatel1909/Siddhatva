import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProductCard } from '../components/product/ProductCard';
import { FadeInSection } from '../components/shared/FadeInSection';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBeF9XmMBdUn8qsSL9k0cLWgm7vXK77hXF7wE7bn1pt6GY2qxh7w-OJg7NBzl37MmkzU7V1aiy05FD-wbuL1QIby6GPSeXkfbInX0kGgicNJdxL0GdqMd5MTt7OI1PBV2d32OgRwFwy1P9Cs2PCQMj0FFdRVeuCCHOfbdogLZkdtlvGZ3tFKMNeEVsc6-wu7QDA3bLEP7so7aR8RKuvjCAPxypXpNmd_KLG0NR3oN5SshmDI-GHL5QVzAJ6NJfcItwz83O-10DekuWT';

const PHILOSOPHY_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAcGIlQnsdPnS77dayPtlQUr_fzXCPrZoCOk17I2Seh2ONtBX9JV2TvJ6jvbdVF8jSUIx37aAPkiQgf1AHsMiTwrMPrXK8j7uNDZzl2BZL4eu9wkGM1JvvKf82LbVvPbAlP0tWuzItRfY4jnj3C6UTrEtCZcSJG3xW4Ytm6rMEKBx0saf2D8MhSrFXb7m4TDkuSlub2QFRcByjhazilMwdbZYin0tT4XUubZvIo4OOeQ0kiarvsWZjI97x3tETo_GoRJzfZJW3ig0Zj';

const COLLECTIONS = [
  {
    label: 'Men',
    copy: 'Structured bronze essentials.',
    gradient: 'from-primary/60',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCHtPgOhJdYnkSW_RkAWN8a4VIE91L3snr7DOCXQpXMxvAFkFnr38eIrb3ynpAfMDCgg1mPMCeYHiPtnlzOl8_jY8Kwpj-yXMoDilmyW4e9RNeYhMJm9DrWsJYIJAlKAZ0z50hnFCG6tuiVivZUs71b6i_W6wla7qeq6NY_GyjAMeJDCsuWFgppKSXEJpkjVhhHYym8EtXS0RFL6XwpBeB7eX88JixaL7VGs838o9ldg4MyW_bmsTW0x3sAWJObPNZP2Ric9kMwux7',
  },
  {
    label: 'Women',
    copy: 'Fluid blush silhouettes.',
    gradient: 'from-secondary/60',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHanRN7G4r36yTq3ceIdN7C9urTwV2dqsTYt0mFduRaDv-eXJZKxHAz_rxhpUrxgjAzK4wObuTeqlA8RN0RR-3ptre2yjAZpc4pN4yk2QB3PQpzFkYCh2KLlECBlc5OF2Wdhky9h8nxpkaPTBa_TJe-4S74FmQaQfdUwOumErse9iD5euo9JIVV48zImqBXtct8tfiXbXiHnidDTJuuE0aFoE7NHfSr6zjggU7fIg-FT7OT_gnCCoGXLCftb0UvSQDVMP_f5SErHZn',
  },
  {
    label: 'Kids',
    copy: 'Golden moments of youth.',
    gradient: 'from-tertiary/60',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC7r-vsDyOnZ-rFNORwooLLc3d1kt9_l2Q4ZVn-lycl5WZjNIoUeoXDLJn5jli-ohdAibrlAI-mw1cEb-8SQq2GLrouELdsYOmLBwKsNct1aBu4U2VYM1XJ9wmhBfxsfG7lkjua_rDGNhzDxSF5PF3EmlHmpzq0Kw4TjsLWWRUlFQcMAtg_qPzZdT5D74nKKunlUvvsgxPDiOlhTyQYTKzZMlUpDUusgJ1YOSqlrGgDJakYFBKZuB1nS_rvy_3VGEBBpKCmyLl-Cice',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const newArrivals = products.slice(0, 4);
  const heroBgRef = useRef<HTMLDivElement>(null);

  // Slow mouse parallax on the hero backdrop, as in the mockup
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const el = heroBgRef.current;
      if (!el) return;
      const moveX = (e.clientX - window.innerWidth / 2) * 0.005;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.005;
      el.style.transform = `scale(1.05) translate(${moveX}px, ${moveY}px)`;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative h-[85vh] overflow-hidden">
        <div className="absolute inset-0 bg-on-background/20 z-10" />
        <div
          ref={heroBgRef}
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        <div className="relative z-20 h-full flex flex-col justify-center items-center text-center px-margin-mobile">
          <span className="font-label-sm text-label-sm text-white uppercase tracking-[0.3em] mb-md drop-shadow-sm">
            Luxe Minimalist Edition
          </span>
          <h1 className="font-display text-4xl md:text-display text-white max-w-4xl mb-lg drop-shadow-md">
            The Warmth of Silence
          </h1>
          <div className="flex flex-col sm:flex-row gap-md">
            <button
              onClick={() => navigate('/shop')}
              className="bg-primary text-on-primary px-xl py-md rounded font-body-md font-semibold hover:brightness-110 transition-all active:scale-95 shadow-lg"
            >
              Explore Summer 24
            </button>
            <button className="border border-white text-white px-xl py-md rounded font-body-md font-semibold hover:bg-white/10 backdrop-blur-md transition-all active:scale-95">
              View Lookbook
            </button>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <FadeInSection className="py-24 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <h2 className="font-display text-headline-lg text-on-surface">New Arrivals</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
              Blush tones and bronze textures for the curated life.
            </p>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="font-label-sm text-label-sm text-primary flex items-center gap-xs hover:gap-sm transition-all font-bold"
          >
            VIEW ALL <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {newArrivals.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.images[0].src}
              imageAlt={product.images[0].alt}
              subtitle={product.variant}
              badge={product.badge}
              onViewDetails={() => navigate(`/product/${product.id}`)}
              onAddToCart={() => addItem(product, product.colors[0], product.sizes[0])}
            />
          ))}
        </div>
      </FadeInSection>

      {/* Philosophy */}
      <FadeInSection className="bg-surface-container-low py-24 border-y border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
          <div className="relative">
            <div className="aspect-[4/5] relative z-10 overflow-hidden rounded shadow-2xl">
              <img
                src={PHILOSOPHY_IMAGE}
                alt="The Philosophy"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-[4000ms]"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-tertiary/20 rounded -z-0 hidden md:block" />
          </div>
          <div className="space-y-lg">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-[0.3em] font-bold">
              The Philosophy
            </span>
            <h2 className="font-display text-headline-lg leading-tight">
              The Art of Intentional Presence.
            </h2>
            <p className="font-body-md text-body-lg text-on-surface-variant leading-relaxed">
              Siddhatva is a dialogue between the tactile and the timeless. In our Luxe Minimalist
              collection, we weave the softness of blush with the strength of bronze, creating a
              sanctuary of style that resonates with the soul.
            </p>
            <div className="flex flex-col gap-lg border-l-2 border-primary/20 pl-lg">
              <div>
                <h4 className="font-display text-lg text-primary">Conscious Materiality</h4>
                <p className="font-body-md text-sm text-on-surface-variant">
                  Every thread is chosen for its longevity and gentle footprint on the earth.
                </p>
              </div>
              <div>
                <h4 className="font-display text-lg text-primary">Fluid Architecture</h4>
                <p className="font-body-md text-sm text-on-surface-variant">
                  Silhouettes that respect the body&apos;s movement and the spirit&apos;s need for space.
                </p>
              </div>
            </div>
            <button className="bg-primary text-on-primary px-xl py-md rounded font-body-md font-bold hover:brightness-110 transition-all active:scale-95 shadow-md">
              Discover Our Atelier
            </button>
          </div>
        </div>
      </FadeInSection>

      {/* Curated Collections */}
      <FadeInSection className="py-24 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        <h2 className="font-display text-headline-lg text-center mb-xl">Curated Collections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {COLLECTIONS.map((collection) => (
            <button
              key={collection.label}
              onClick={() => navigate('/shop')}
              className="relative group h-[600px] overflow-hidden rounded shadow-lg bg-surface-container text-left"
            >
              <img
                src={collection.image}
                alt={collection.label}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${collection.gradient} via-transparent to-transparent opacity-80`} />
              <div className="absolute bottom-lg left-lg p-md">
                <h3 className="font-display text-2xl text-white mb-xs">{collection.label}</h3>
                <p className="font-body-md text-sm text-white/90 mb-md">{collection.copy}</p>
                <span className="text-white border-b-2 border-white pb-1 font-label-sm text-label-sm font-bold">
                  EXPLORE
                </span>
              </div>
            </button>
          ))}
        </div>
      </FadeInSection>

      {/* Newsletter */}
      <FadeInSection id="newsletter" className="py-24 bg-surface-variant/30 border-y border-outline-variant/30">
        <div className="max-w-3xl mx-auto text-center px-margin-mobile">
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-[0.2em] mb-md block font-bold">
            The Golden Circle
          </span>
          <h2 className="font-display text-headline-lg mb-lg">Experience the Collection First.</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
            Join our inner circle for exclusive access to atelier previews, limited edition drops,
            and high-fashion editorial insights.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-md"
          >
            <input
              className="flex-grow bg-surface border border-outline-variant px-lg py-md rounded focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md"
              placeholder="Email Address"
              type="email"
            />
            <button className="bg-primary text-on-primary px-xl py-md rounded font-body-md font-bold hover:brightness-110 transition-all active:scale-95 whitespace-nowrap shadow-md">
              Subscribe Now
            </button>
          </form>
          <p className="text-xs text-on-surface-variant/70 mt-md italic">
            Respecting your privacy as much as your style.
          </p>
        </div>
      </FadeInSection>
    </MainLayout>
  );
};
