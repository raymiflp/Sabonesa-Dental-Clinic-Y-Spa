import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSync } from './lib/sync'
import { ThemeProvider } from './context/ThemeContext'

// Anti-FOUC: apply theme class before first paint
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = (stored === 'light' || stored === 'dark') ? stored : (systemDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();

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
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)