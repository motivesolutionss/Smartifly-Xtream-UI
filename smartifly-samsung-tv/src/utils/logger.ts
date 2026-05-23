const IS_DEV = import.meta.env.DEV;

export const logger = {
  info: (message: string, data?: unknown) => {
    if (IS_DEV) {
      console.log(`[INFO] ${message}`, data || "");
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error || "");
  },
  warn: (message: string, data?: unknown) => {
    if (IS_DEV) {
      console.warn(`[WARN] ${message}`, data || "");
    }
  },
  debug: (message: string, data?: unknown) => {
    if (IS_DEV) {
      console.debug(`[DEBUG] ${message}`, data || "");
    }
  },
};
