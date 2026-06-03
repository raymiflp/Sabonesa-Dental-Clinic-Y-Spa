import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSync } from './lib/sync'

// Register Service Worker for offline asset caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registered:', reg.scope);
      // Forzar chequeo de actualizaciones en cada carga
      reg.update();
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

// Initialize sync manager
initSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
