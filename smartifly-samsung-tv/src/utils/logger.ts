const IS_DEV = import.meta.env.DEV;

/**
 * In production (emulator / real TV), debug/info/warn logs are suppressed by default.
 * Set `localStorage.setItem('smartifly_debug', '1')` in the emulator console to enable
 * verbose logging without rebuilding.
 */
const isDebugForced = () => {
  try {
    return localStorage.getItem("smartifly_debug") === "1";
  } catch {
    return false;
  }
};

const shouldLog = () => IS_DEV || isDebugForced();

export const logger = {
  info: (message: string, data?: unknown) => {
    if (shouldLog()) {
      console.log(`[INFO] ${message}`, data ?? "");
    }
  },
  error: (message: string, error?: unknown) => {
    // Errors always log — even in production builds on the TV/emulator.
    console.error(`[ERROR] ${message}`, error ?? "");
  },
  warn: (message: string, data?: unknown) => {
    if (shouldLog()) {
      console.warn(`[WARN] ${message}`, data ?? "");
    }
  },
  debug: (message: string, data?: unknown) => {
    if (shouldLog()) {
      console.debug(`[DEBUG] ${message}`, data ?? "");
    }
  },
};
