import { imageFailureMemory } from "./imageFailureMemory";

const LOW_TRUST_IMAGE_HOSTS = new Set(
  (import.meta.env.VITE_SMARTIFLY_LOW_TRUST_IMAGE_HOSTS ?? "starshare.one,starshare.live")
    .split(",")
    .map((host: string) => host.trim().toLowerCase())
    .filter(Boolean)
);
const IMAGE_URL_CONTROL_CHARS = /[\u0000-\u001F]/g;
const IMAGE_URL_INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;
let portalImageBaseUrl: string | null = null;

export const setPortalImageBaseUrl = (baseUrl?: string | null) => {
  const trimmed = baseUrl?.trim().replace(/\/+$/, "");
  if (!trimmed) {
    portalImageBaseUrl = null;
    return;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    portalImageBaseUrl = null;
    return;
  }

  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) {
      portalImageBaseUrl = null;
      return;
    }

    parsed.pathname = parsed.pathname.replace(/\/player_api\.php$/i, "");
    parsed.search = "";
    parsed.hash = "";
    portalImageBaseUrl = parsed.toString().replace(/\/+$/, "");
  } catch {
    portalImageBaseUrl = null;
  }
};

const extractHost = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.trim().toLowerCase() || null;
  } catch {
    return null;
  }
};

const getTrustScore = (url: string, index: number) => {
  let score = 0;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") {
      score += 40;
    }

    const host = parsed.hostname.trim().toLowerCase();
    if (host && !LOW_TRUST_IMAGE_HOSTS.has(host)) {
      score += 25;
    }

    score -= imageFailureMemory.getHostFailurePenalty(host);
  } catch {
    score -= 1000;
  }

  return score - index * 0.001;
};

export const stableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const normalizeImageUrl = (value?: string): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  let normalized = trimmed
    .replace(IMAGE_URL_CONTROL_CHARS, "")
    .replace(IMAGE_URL_INVISIBLE_CHARS, "");

  if (!normalized) return null;
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  } else if (normalized.startsWith("/")) {
    if (!portalImageBaseUrl) return null;
    normalized = `${portalImageBaseUrl}${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !parsed.hostname
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

export const resolveFirstImageCandidate = (
  ...urls: Array<string | undefined>
): string | null => {
  for (const url of urls) {
    const normalized = normalizeImageUrl(url);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

export const resolveImageCandidates = (
  urls: Array<string | undefined>
): string[] => {
  const normalized = urls
    .map((url) => normalizeImageUrl(url))
    .filter((url): url is string => Boolean(url));

  const deduped = Array.from(new Set(normalized));

  return deduped
    .filter((url) => !imageFailureMemory.isHostSuppressed(url))
    .sort((left, right) => {
      const leftScore = getTrustScore(left, deduped.indexOf(left));
      const rightScore = getTrustScore(right, deduped.indexOf(right));
      return rightScore - leftScore;
    });
};

export const isLowTrustImageHost = (urlOrHost?: string) => {
  if (!urlOrHost) return false;
  const host = urlOrHost.includes("://") ? extractHost(urlOrHost) : urlOrHost.trim().toLowerCase();
  return Boolean(host && LOW_TRUST_IMAGE_HOSTS.has(host));
};
