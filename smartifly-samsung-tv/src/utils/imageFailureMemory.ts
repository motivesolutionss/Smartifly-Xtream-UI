const BASE_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_FAILURE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FAILURE_RESET_WINDOW_MS = 30 * 60 * 1000;

type FailureEntry = {
  failedAt: number;
  failureCount: number;
};

const failedImages = new Map<string, FailureEntry>();
const listeners = new Set<() => void>();
let revision = 0;

const emitChange = () => {
  revision += 1;
  listeners.forEach((listener) => listener());
};

const getCooldownMs = (failureCount: number) =>
  Math.min(
    MAX_FAILURE_COOLDOWN_MS,
    BASE_FAILURE_COOLDOWN_MS * Math.max(1, 2 ** (failureCount - 1))
  );

export const imageFailureMemory = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getRevision() {
    return revision;
  },
  hasFailed(url?: string) {
    if (!url) return false;
    const entry = failedImages.get(url);
    if (!entry) return false;

    if (Date.now() - entry.failedAt >= getCooldownMs(entry.failureCount)) {
      failedImages.delete(url);
      emitChange();
      return false;
    }

    return true;
  },
  markFailed(url?: string) {
    if (!url) return;
    const now = Date.now();
    const previousEntry = failedImages.get(url);

    if (!previousEntry || now - previousEntry.failedAt > FAILURE_RESET_WINDOW_MS) {
      failedImages.set(url, { failedAt: now, failureCount: 1 });
      emitChange();
      return;
    }

    failedImages.set(url, {
      failedAt: now,
      failureCount: previousEntry.failureCount + 1,
    });
    emitChange();
  },
  markLoaded(url?: string) {
    if (!url) return;
    if (failedImages.delete(url)) {
      emitChange();
    }
  },
  clear() {
    if (failedImages.size === 0) return;
    failedImages.clear();
    emitChange();
  },
};
