import { logger } from "../utils/logger";

type PendingWrite =
  | { mode: "set"; serialized: string }
  | { mode: "remove" };

const pendingWrites = new Map<string, PendingWrite>();
const pendingTimers = new Map<string, number>();
let flushListenersRegistered = false;

const clearPendingTimer = (key: string) => {
  const timerId = pendingTimers.get(key);
  if (timerId !== undefined) {
    window.clearTimeout(timerId);
    pendingTimers.delete(key);
  }
};

const flushPendingKey = (key: string) => {
  clearPendingTimer(key);
  const pending = pendingWrites.get(key);
  if (!pending) return;

  pendingWrites.delete(key);

  try {
    if (pending.mode === "remove") {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, pending.serialized);
  } catch (error) {
    logger.error(`Error flushing local storage key: ${key}`, error);
  }
};

const flushAllPendingWrites = () => {
  Array.from(pendingWrites.keys()).forEach((key) => {
    flushPendingKey(key);
  });
};

const registerFlushListeners = () => {
  if (flushListenersRegistered || typeof window === "undefined") return;

  const flush = () => {
    flushAllPendingWrites();
  };

  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  });

  flushListenersRegistered = true;
};

const schedulePendingFlush = (key: string, delayMs: number) => {
  registerFlushListeners();
  clearPendingTimer(key);

  if (delayMs <= 0) {
    flushPendingKey(key);
    return;
  }

  const timerId = window.setTimeout(() => {
    flushPendingKey(key);
  }, delayMs);

  pendingTimers.set(key, timerId);
};

export const localStorageService = {
  get: <T>(key: string): T | null => {
    const pending = pendingWrites.get(key);
    if (pending) {
      if (pending.mode === "remove") {
        return null;
      }

      try {
        return JSON.parse(pending.serialized) as T;
      } catch (error) {
        logger.error(`Error reading pending local storage key: ${key}`, error);
        return null;
      }
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      logger.error(`Error reading local storage key: ${key}`, error);
      return null;
    }
  },

  set: <T>(key: string, value: T): void => {
    clearPendingTimer(key);
    pendingWrites.delete(key);

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error(`Error writing local storage key: ${key}`, error);
    }
  },

  setDeferred: <T>(key: string, value: T, delayMs = 250): void => {
    try {
      pendingWrites.set(key, {
        mode: "set",
        serialized: JSON.stringify(value),
      });
      schedulePendingFlush(key, delayMs);
    } catch (error) {
      logger.error(`Error queueing local storage key: ${key}`, error);
    }
  },

  remove: (key: string): void => {
    clearPendingTimer(key);
    pendingWrites.delete(key);
    localStorage.removeItem(key);
  },

  removeDeferred: (key: string, delayMs = 0): void => {
    pendingWrites.set(key, { mode: "remove" });
    schedulePendingFlush(key, delayMs);
  },

  clear: (): void => {
    pendingTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    pendingTimers.clear();
    pendingWrites.clear();
    localStorage.clear();
  },

  flushPending: (): void => {
    flushAllPendingWrites();
  },
};
