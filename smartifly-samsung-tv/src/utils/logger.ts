import { getPerfSessionId } from "./perfSession";

const IS_DEV = import.meta.env.DEV;
const MAX_BUFFERED_LOGS = 400;
const DEBUG_STORAGE_KEY = "smartifly_debug";
const DEBUG_CHANGE_EVENT = "smartifly:debug-changed";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

type LogEntry = {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
};

declare global {
  interface Window {
    __smartiflyLogs?: LogEntry[];
    __smartiflyLogger?: {
      getLogs: () => LogEntry[];
      clearLogs: () => void;
      setDebugEnabled: (enabled: boolean) => void;
      isDebugEnabled: () => boolean;
      status: () => {
        isDev: boolean;
        envEnabled: boolean;
        runtimeEnabled: boolean;
        effectiveEnabled: boolean;
        perfSessionId: string;
      };
    };
  }
}

/**
 * In production (emulator / real TV), debug/info/warn logs are suppressed by default.
 * Set `localStorage.setItem('smartifly_debug', '1')` in the emulator console to enable
 * verbose logging without rebuilding.
 */
const isDebugForced = () => {
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const isDebugEnabledByEnv = () => {
  const value = import.meta.env.VITE_SMARTIFLY_DEBUG_LOGS?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
};

export const isDebugLoggingEnabled = () =>
  IS_DEV || isDebugEnabledByEnv() || isDebugForced();

export const setRuntimeDebugLoggingEnabled = (enabled: boolean) => {
  try {
    if (enabled) {
      localStorage.setItem(DEBUG_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(DEBUG_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures on constrained runtimes.
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEBUG_CHANGE_EVENT, { detail: { enabled } }));
  }
};

export const subscribeToDebugLoggingChanges = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(DEBUG_CHANGE_EVENT, handleChange as EventListener);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(DEBUG_CHANGE_EVENT, handleChange as EventListener);
    window.removeEventListener("storage", handleChange);
  };
};

const shouldLog = () => isDebugLoggingEnabled();

const ensureLoggerApi = () => {
  if (typeof window === "undefined") return;
  if (!window.__smartiflyLogger) {
    window.__smartiflyLogger = {
      getLogs: () => window.__smartiflyLogs?.slice() || [],
      clearLogs: () => {
        if (window.__smartiflyLogs) {
          window.__smartiflyLogs.length = 0;
        }
      },
      setDebugEnabled: (enabled: boolean) => {
        setRuntimeDebugLoggingEnabled(enabled);
      },
      isDebugEnabled: () => isDebugLoggingEnabled(),
      status: () => ({
        isDev: IS_DEV,
        envEnabled: isDebugEnabledByEnv(),
        runtimeEnabled: isDebugForced(),
        effectiveEnabled: isDebugLoggingEnabled(),
        perfSessionId: getPerfSessionId(),
      }),
    };
  }
};

const pushBufferedLog = (entry: LogEntry) => {
  if (typeof window === "undefined") return;
  if (!window.__smartiflyLogs) {
    window.__smartiflyLogs = [];
  }
  ensureLoggerApi();
  window.__smartiflyLogs.push(entry);
  if (window.__smartiflyLogs.length > MAX_BUFFERED_LOGS) {
    window.__smartiflyLogs.splice(0, window.__smartiflyLogs.length - MAX_BUFFERED_LOGS);
  }
};

ensureLoggerApi();

const log = (level: LogLevel, message: string, data?: unknown) => {
  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  pushBufferedLog(entry);

  const prefix = `[${level}] ${message}`;
  if (level === "ERROR") {
    console.error(prefix, data ?? "");
    return;
  }
  if (!shouldLog()) return;
  if (level === "WARN") {
    console.warn(prefix, data ?? "");
    return;
  }
  if (level === "DEBUG") {
    console.debug(prefix, data ?? "");
    return;
  }
  console.log(prefix, data ?? "");
};

export const logger = {
  info: (message: string, data?: unknown) => {
    log("INFO", message, data);
  },
  error: (message: string, error?: unknown) => {
    // Errors always log, even in production builds on the TV/emulator.
    log("ERROR", message, error);
  },
  warn: (message: string, data?: unknown) => {
    log("WARN", message, data);
  },
  debug: (message: string, data?: unknown) => {
    log("DEBUG", message, data);
  },
};
