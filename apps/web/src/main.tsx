import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import './index.css';
import { applyAppTheme, themeCache } from '@/shared/theme/app-theme';

// The last theme is on the page before the first paint; the profile then confirms it
applyAppTheme(themeCache.read());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
