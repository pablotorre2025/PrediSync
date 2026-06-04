import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

const CHUNK_RELOAD_FLAG = 'smp:chunk-reload';

function tryRecoverFromChunkError() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1') return;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  } catch {
    // Ignore sessionStorage failures and still attempt reload.
  }
  window.location.reload();
}

function isChunkLikeMessage(value: unknown): boolean {
  const message = value instanceof Error ? value.message : String(value ?? '');
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|Load failed|Failed to fetch/i.test(message);
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  tryRecoverFromChunkError();
});

window.addEventListener('unhandledrejection', (event) => {
  if (!isChunkLikeMessage(event.reason)) return;
  event.preventDefault();
  tryRecoverFromChunkError();
});

window.addEventListener('error', (event) => {
  if (!isChunkLikeMessage(event.error ?? event.message)) return;
  tryRecoverFromChunkError();
});

window.addEventListener('pageshow', () => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    // Ignore storage cleanup errors.
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
