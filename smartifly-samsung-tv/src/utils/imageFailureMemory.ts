const BASE_FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_FAILURE_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FAILURE_RESET_WINDOW_MS = 30 * 60 * 1000;
const HOST_FAILURE_RESET_WINDOW_MS = 10 * 60 * 1000;
const HOST_SUPPRESSION_THRESHOLD = 3;
const HOST_SUPPRESSION_COOLDOWN_MS = 15 * 60 * 1000;

type FailureEntry = {
  failedAt: number;
  failureCount: number;
};

type HostFailureEntry = {
  failedAt: number;
  failureCount: number;
  suppressedUntil: number;
};

const failedImages = new Map<string, FailureEntry>();
const failedHosts = new Map<string, HostFailureEntry>();
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

const extractHost = (urlOrHost?: string) => {
  const trimmed = urlOrHost?.trim();
  if (!trimmed) return null;

  if (!trimmed.includes("://")) {
    return trimmed.toLowerCase();
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.hostname.trim().toLowerCase() || null;
  } catch {
    return null;
  }
};

const getHostEntry = (host: string) => {
  const entry = failedHosts.get(host);
  if (!entry) return null;

  if (entry.suppressedUntil > 0 && Date.now() >= entry.suppressedUntil) {
    failedHosts.delete(host);
    emitChange();
    return null;
  }

  return entry;
};

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
    const host = extractHost(url);
    if (host) {
      const hostEntry = getHostEntry(host);
      if (hostEntry?.suppressedUntil && hostEntry.suppressedUntil > Date.now()) {
        return true;
      }
    }

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
    const host = extractHost(url);

    if (!previousEntry || now - previousEntry.failedAt > FAILURE_RESET_WINDOW_MS) {
      failedImages.set(url, { failedAt: now, failureCount: 1 });
    } else {
      failedImages.set(url, {
        failedAt: now,
        failureCount: previousEntry.failureCount + 1,
      });
    }

    if (host) {
      const previousHostEntry = failedHosts.get(host);
      const nextFailureCount =
        !previousHostEntry || now - previousHostEntry.failedAt > HOST_FAILURE_RESET_WINDOW_MS
          ? 1
          : previousHostEntry.failureCount + 1;

      failedHosts.set(host, {
        failedAt: now,
        failureCount: nextFailureCount,
        suppressedUntil:
          nextFailureCount >= HOST_SUPPRESSION_THRESHOLD
            ? now + HOST_SUPPRESSION_COOLDOWN_MS
            : previousHostEntry?.suppressedUntil ?? 0,
      });
    }

    emitChange();
  },
  markLoaded(url?: string) {
    if (!url) return;
    const removedImage = failedImages.delete(url);
    imageFailureMemory.markHostSuccess(url);
    if (removedImage) emitChange();
  },
  markHostSuccess(urlOrHost?: string) {
    const host = extractHost(urlOrHost);
    if (!host) return;
    if (failedHosts.delete(host)) {
      emitChange();
    }
  },
  isHostSuppressed(urlOrHost?: string) {
    const host = extractHost(urlOrHost);
    if (!host) return false;
    const entry = getHostEntry(host);
    return Boolean(entry?.suppressedUntil && entry.suppressedUntil > Date.now());
  },
  getHostFailurePenalty(urlOrHost?: string) {
    const host = extractHost(urlOrHost);
    if (!host) return 0;
    const entry = getHostEntry(host);
    if (!entry) return 0;
    return entry.failureCount * 10;
  },
  getHostFailureCount(urlOrHost?: string) {
    const host = extractHost(urlOrHost);
    if (!host) return 0;
    const entry = getHostEntry(host);
    return entry?.failureCount ?? 0;
  },
  clear() {
    if (failedImages.size === 0 && failedHosts.size === 0) return;
    failedImages.clear();
    failedHosts.clear();
    emitChange();
  },
};
