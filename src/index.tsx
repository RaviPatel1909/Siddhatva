import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initAnalytics } from './lib/analytics';

// Initialize GA4 (no-op unless VITE_GA4_ID is set — dev-safe, no console noise).
initAnalytics();

// Start the MSW mock backend in dev before the app renders, so the first
// queries are already intercepted. It runs only when the API is the in-app mock
// (a relative VITE_API_URL); when VITE_API_URL points at a real server the mock
// is disabled. Set VITE_USE_MSW=true to force the mock (e.g. to work offline).
// Never runs in the production bundle.
async function enableMocking(): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api';
  const isRealServer = /^https?:\/\//i.test(apiUrl);
  const useMock =
    import.meta.env.DEV && (import.meta.env.VITE_USE_MSW === 'true' || !isRealServer);
  if (!useMock) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
