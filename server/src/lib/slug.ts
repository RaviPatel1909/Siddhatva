// Identical to the frontend/MSW slug algorithm (docs/API_CONTRACT.md), so
// GET /products/:slug resolves the same product on both sides.
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
