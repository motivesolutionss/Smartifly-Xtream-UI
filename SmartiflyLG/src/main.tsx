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

function installKeyboardEventKeyPolyfill() {
  if (typeof window === 'undefined' || typeof KeyboardEvent === 'undefined') {
    return;
  }

  const proto = KeyboardEvent.prototype;
  let needsPolyfill = !('key' in proto);

  if (!needsPolyfill) {
    try {
      const e = new KeyboardEvent('keydown');
      if (e.key === undefined) {
        needsPolyfill = true;
      }
    } catch (err) {
      // If KeyboardEvent constructor is not supported on legacy Chrome v38,
      // fallback to prototype checks.
      if (!('key' in proto)) {
        needsPolyfill = true;
      }
    }
  }

  if (needsPolyfill) {
    const keyMap: Record<number, string> = {
      8: 'Backspace',
      9: 'Tab',
      13: 'Enter',
      27: 'Escape',
      32: ' ',
      33: 'PageUp',
      34: 'PageDown',
      35: 'End',
      36: 'Home',
      37: 'ArrowLeft',
      38: 'ArrowUp',
      39: 'ArrowRight',
      40: 'ArrowDown',
      45: 'Insert',
      46: 'Delete',
      461: 'GoBack',    // LG webOS back button
      10009: 'Backspace' // Samsung Tizen back button
    };

    // Number keys
    for (let i = 48; i <= 57; i++) {
      keyMap[i] = String.fromCharCode(i);
    }
    // Letter keys
    for (let i = 65; i <= 90; i++) {
      keyMap[i] = String.fromCharCode(i);
    }

    try {
      Object.defineProperty(proto, 'key', {
        get(this: KeyboardEvent) {
          const code = this.keyCode || this.which;
          if (keyMap[code] !== undefined) {
            if (code >= 65 && code <= 90 && !this.shiftKey) {
              return keyMap[code].toLowerCase();
            }
            return keyMap[code];
          }
          const char = String.fromCharCode(code);
          return char || 'Unidentified';
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      console.error('Failed to define KeyboardEvent.prototype.key polyfill:', e);
    }
  }
}

try {
  installLegacyRandomUuidPolyfill();
  installKeyboardEventKeyPolyfill();

  if (import.meta.env.DEV) {
    void import('./features/player/debug/iptvReleaseTimingDebug').then(({ installIptvDebugTools }) => {
      installIptvDebugTools();
    });

    void import('./debug/iptvRevisitDebug').then(({ installIptvRevisitDebug }) => {
      installIptvRevisitDebug();
    });
  }

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
