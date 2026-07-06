// Email design tokens — the single source of truth for email styling, mirroring
// the storefront's Tailwind design system (tailwind.config.js). Emails can't use
// Tailwind classes (mail clients need inline styles), so the canonical hex values
// live here once rather than being sprinkled raw through each template.
export const email = {
  color: {
    primary: '#b87b5a', // warm bronze
    onPrimary: '#ffffff',
    primaryContainer: '#fceee6',
    background: '#fff9ed', // warm cream
    surface: '#ffffff',
    onSurface: '#2c2824',
    onSurfaceVariant: '#5a4b4e',
    outlineVariant: '#e0d9cb',
    success: '#16a34a',
  },
  font: {
    // Geist to match the storefront, with an email-safe fallback stack for
    // clients that ignore the webfont.
    family: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  // Google Fonts href for the <Font> webFont (Geist), used by the shared layout.
  geistWebFont: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap',
} as const;
