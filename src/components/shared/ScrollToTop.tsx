import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Resets scroll on route change. Runs in a layout effect so the reset lands
// before the new page's first paint — the route fade-in starts already at top.
// Only pathname changes trigger a reset: query-string updates (shop filters,
// sort) and same-page hash changes never force a jump. When a navigation
// carries a hash, we jump to that element instead of the top.
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const prevPathname = useRef(pathname);

  useLayoutEffect(() => {
    const pathChanged = prevPathname.current !== pathname;
    prevPathname.current = pathname;
    if (!pathChanged) return;

    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    // html has scroll-behavior: smooth — suspend it so the reset is instant
    // rather than an animated scroll racing the page transition.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousBehavior;

    // Reset any opted-in inner scroll containers (none of the current layouts
    // scroll content in a nested pane — window is the scroller — but this
    // keeps future layouts covered).
    document.querySelectorAll('[data-scroll-container]').forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname, hash]);

  return null;
};
