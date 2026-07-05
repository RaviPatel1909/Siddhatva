import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Keep the CRA output dir so existing tooling / .gitignore (/build) still apply.
    outDir: 'build',
  },
});
