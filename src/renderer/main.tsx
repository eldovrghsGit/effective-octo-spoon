import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';

// When running outside Electron (e.g. plain browser / Codespaces),
// install a browser-safe mock so the app doesn't crash on missing IPC.
if (!window.electronAPI) {
  import('./browser-mock').then(({ browserElectronAPI }) => {
    window.electronAPI = browserElectronAPI;
    boot();
  });
} else {
  boot();
}

function boot() {
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
}
