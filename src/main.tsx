import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import { ThemeProvider } from '@gravity-ui/uikit';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.js';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <App />
  </ThemeProvider>
);
