import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Only inject ngrok-skip-browser-warning on internal/app API fetches
// Never inject custom headers on external tile servers (ArcGIS, CARTO, MapLibre) to avoid CORS preflight rejection
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  let urlStr = '';
  if (typeof input === 'string') {
    urlStr = input;
  } else if (input instanceof URL) {
    urlStr = input.href;
  } else if (input && typeof (input as Request).url === 'string') {
    urlStr = (input as Request).url;
  }

  const isInternal = 
    urlStr.startsWith('/') || 
    urlStr.startsWith(window.location.origin) ||
    (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'));

  if (isInternal) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    if (!headers.has('ngrok-skip-browser-warning')) {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    init.headers = headers;
  }
  return originalFetch.call(this, input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

