const BASE_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_FAILURE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FAILURE_RESET_WINDOW_MS = 30 * 60 * 1000;

type FailureEntry = {
  failedAt: number;
  failureCount: number;
};

const failedImages = new Map<string, FailureEntry>();

const getCooldownMs = (failureCount: number) =>
  Math.min(
    MAX_FAILURE_COOLDOWN_MS,
    BASE_FAILURE_COOLDOWN_MS * Math.max(1, 2 ** (failureCount - 1))
  );

export const imageFailureMemory = {
  hasFailed(url?: string) {
    if (!url) return false;
    const entry = failedImages.get(url);
    if (!entry) return false;

    if (Date.now() - entry.failedAt >= getCooldownMs(entry.failureCount)) {
      failedImages.delete(url);
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
      return;
    }

    failedImages.set(url, {
      failedAt: now,
      failureCount: previousEntry.failureCount + 1,
    });
  },
  markLoaded(url?: string) {
    if (!url) return;
    failedImages.delete(url);
  },
  clear() {
    failedImages.clear();
  },
};
