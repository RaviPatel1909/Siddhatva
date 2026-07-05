/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Canonical Siddhatva "Luxe Minimalist" palette (single source of truth
        // for the whole app — from home_luxe_edition mockup config).
        'primary': '#b87b5a', // Warm bronze
        'on-primary': '#ffffff',
        'primary-container': '#fceee6',
        'on-primary-container': '#4a2a1b',

        'secondary': '#efcf92', // Champagne gold
        'on-secondary': '#453100',
        'secondary-container': '#f9e6ec', // Soft blush accent
        'on-secondary-container': '#4a2330',
        'secondary-fixed': '#f9e6ec',
        'secondary-fixed-dim': '#e7b8c6',
        'on-secondary-fixed': '#4a2330',

        'tertiary': '#e7b8c6', // Blush
        'on-tertiary': '#4a2330',
        'tertiary-fixed': '#efcf92',
        'on-tertiary-fixed': '#453100',

        'background': '#fff9ed', // Warm cream page base
        'on-background': '#2c2824',
        'surface': '#ffffff', // Cards, nav, inputs
        'on-surface': '#2c2824',
        'surface-variant': '#f9e6ec',
        'on-surface-variant': '#5a4b4e',
        'surface-dim': '#e0d9cb',
        'surface-bright': '#fff9ed',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#faf3e4',
        'surface-container': '#f5eedc',
        'surface-container-high': '#ebe4d2',
        'surface-container-highest': '#e0d9cb',
        'surface-tint': '#b87b5a',

        'outline': '#d9c7c0',
        'outline-variant': '#e0d9cb',
        'border': '#e0d9cb',

        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        'inverse-surface': '#332e29',
        'inverse-on-surface': '#f7f0e1',
        'inverse-primary': '#f0c3a9',
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'lg': '0.25rem',
        'xl': '0.5rem',
        'full': '0.75rem',
      },
      spacing: {
        'gutter': '24px',
        'sm': '16px',
        'margin-mobile': '16px',
        'xs': '8px',
        'base': '4px',
        'margin-desktop': '48px',
        'lg': '40px',
        'md': '24px',
        'xl': '64px',
      },
      fontFamily: {
        'label-sm': ['Geist', 'sans-serif'],
        'headline-md': ['Geist', 'sans-serif'],
        'headline-lg': ['Geist', 'sans-serif'],
        'body-md': ['Geist', 'sans-serif'],
        'body-lg': ['Geist', 'sans-serif'],
        'display': ['Geist', 'sans-serif'],
      },
      fontSize: {
        'label-sm': ['12px', { lineHeight: '1.0', letterSpacing: '0.05em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      boxShadow: {
        'bronze': '0 10px 30px -10px rgba(184, 123, 90, 0.15)',
        'bronze-hover': '0 20px 40px -10px rgba(184, 123, 90, 0.2)',
      },
    },
  },
};
