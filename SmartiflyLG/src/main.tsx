import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

declare global {
  interface Window {
    __SMARTIFLY_BOOT_DEBUG__?: {
      hide: () => void;
      setStatus: (message: string) => void;
      appendLog: (label: string, detail: unknown) => void;
    };
  }

  interface Crypto {
    randomUUID?: () => string;
  }
}

const bootDebug = window.__SMARTIFLY_BOOT_DEBUG__;

function installLegacyRandomUuidPolyfill() {
  if (typeof window === 'undefined' || !window.crypto || typeof window.crypto.randomUUID === 'function') {
    return;
  }

  window.crypto.randomUUID = function randomUUIDPolyfill() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : ((random & 0x3) | 0x8);
      return value.toString(16);
    });
  };
}

try {
  installLegacyRandomUuidPolyfill();
  bootDebug?.setStatus('Bundle loaded. Preparing React root...');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root element in index.html');
  }

  const root = createRoot(rootElement);
  bootDebug?.setStatus('React root created. Rendering App...');

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  window.setTimeout(() => {
    bootDebug?.setStatus('React render submitted.');
    bootDebug?.hide();
  }, 300);
} catch (error) {
  bootDebug?.setStatus('Startup failed in main.tsx');
  bootDebug?.appendLog('main.tsx startup error', error);
  throw error;
}
