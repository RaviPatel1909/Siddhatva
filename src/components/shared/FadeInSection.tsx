import React, { useEffect, useRef } from 'react';

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const FadeInSection: React.FC<FadeInSectionProps> = ({ children, className = '', id }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id={id} className={`fade-in-section ${className}`}>
      {children}
    </section>
  );
};
