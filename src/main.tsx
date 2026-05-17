import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { initWorkLogDb } from '@/db/workLogRepository';
import './index.css';
import { initTheme } from '@/stores/themeStore';

initTheme();

async function bootstrap() {
  await initWorkLogDb();

  if (Capacitor.isNativePlatform()) {
    document.body.classList.add('capacitor-native');
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
