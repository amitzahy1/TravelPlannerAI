import React from 'react';
import './src/index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Handle stale-build chunk load failures (old index.html in memory points to new chunks
// whose hashes have changed). Reload once to pick up fresh index.html + chunks.
const RELOAD_GUARD_KEY = 'chunkReloadAt';
const isChunkLoadError = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
};
const handleStaleChunk = (err: unknown) => {
  if (!isChunkLoadError(err)) return;
  const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  if (Date.now() - lastReload < 10_000) return; // prevent infinite reload loop
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  console.warn('[App] Stale chunk detected, reloading to pick up fresh build…');
  window.location.reload();
};
window.addEventListener('error', (e) => handleStaleChunk(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => handleStaleChunk(e.reason));

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);