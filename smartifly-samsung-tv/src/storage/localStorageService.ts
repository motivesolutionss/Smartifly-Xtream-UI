import { logger } from "../utils/logger";

type PendingWrite =
  | { mode: "set"; value: unknown; serialized?: string }
  | { mode: "remove" };

const pendingWrites = new Map<string, PendingWrite>();
const pendingTimers = new Map<string, number>();
const pendingSerializationTimers = new Map<string, number>();
let flushListenersRegistered = false;

const clearPendingTimer = (key: string) => {
  const timerId = pendingTimers.get(key);
  if (timerId !== undefined) {
    window.clearTimeout(timerId);
    pendingTimers.delete(key);
  }
};

const clearPendingSerializationTimer = (key: string) => {
  const timerId = pendingSerializationTimers.get(key);
  if (timerId !== undefined) {
    window.clearTimeout(timerId);
    pendingSerializationTimers.delete(key);
  }
};

const ensureSerializedPendingWrite = (key: string) => {
  const pending = pendingWrites.get(key);
  if (!pending || pending.mode !== "set") {
    return pending;
  }

  if (pending.serialized !== undefined) {
    return pending;
  }

  try {
    pending.serialized = JSON.stringify(pending.value);
  } catch (error) {
    pendingWrites.delete(key);
    logger.error(`Error serializing deferred local storage key: ${key}`, error);
    return null;
  }

  return pending;
};

const schedulePendingSerialization = (key: string) => {
  clearPendingSerializationTimer(key);

  const timerId = window.setTimeout(() => {
    pendingSerializationTimers.delete(key);
    ensureSerializedPendingWrite(key);
  }, 32);

  pendingSerializationTimers.set(key, timerId);
};

const flushPendingKey = (key: string) => {
  clearPendingTimer(key);
  clearPendingSerializationTimer(key);
  const pending = ensureSerializedPendingWrite(key);
  if (!pending) return;

  pendingWrites.delete(key);

  try {
    if (pending.mode === "remove") {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, pending.serialized ?? JSON.stringify(pending.value));
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
        if (pending.serialized !== undefined) {
          return JSON.parse(pending.serialized) as T;
        }
        return pending.value as T;
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
    clearPendingSerializationTimer(key);
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
        value,
      });
      schedulePendingSerialization(key);
      schedulePendingFlush(key, delayMs);
    } catch (error) {
      logger.error(`Error queueing local storage key: ${key}`, error);
    }
  },

  remove: (key: string): void => {
    clearPendingTimer(key);
    clearPendingSerializationTimer(key);
    pendingWrites.delete(key);
    localStorage.removeItem(key);
  },

  removeDeferred: (key: string, delayMs = 0): void => {
    pendingWrites.set(key, { mode: "remove" });
    schedulePendingFlush(key, delayMs);
  },

  removeByPrefix: (prefix: string): void => {
    if (!prefix) return;

    Array.from(pendingWrites.keys()).forEach((key) => {
      if (key.startsWith(prefix)) {
        clearPendingTimer(key);
        clearPendingSerializationTimer(key);
        pendingWrites.delete(key);
      }
    });

    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  clear: (): void => {
    pendingTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    pendingTimers.clear();
    pendingSerializationTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    pendingSerializationTimers.clear();
    pendingWrites.clear();
    localStorage.clear();
  },

  flushPending: (): void => {
    flushAllPendingWrites();
  },
};
