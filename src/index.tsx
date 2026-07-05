import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Start the MSW mock backend in dev before the app renders, so the first
// queries are already intercepted. Never runs in the production bundle.
async function enableMocking(): Promise<void> {
  if (!import.meta.env.DEV) return;
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
