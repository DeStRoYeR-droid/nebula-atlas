import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { normalizeInitialUrl } from './router/history.js';
import './styles/index.css';

normalizeInitialUrl();

// After a new deploy, an old tab may request code chunks that no longer exist.
// Reload once to pick up the new build instead of showing a broken page.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'nebula-atlas:reloaded-after-deploy';
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
