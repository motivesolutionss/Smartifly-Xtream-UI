import { imageFailureMemory } from "../utils/imageFailureMemory";
import { isLowTrustImageHost } from "../utils/imagePolicy";

const CONSTRAINED_HOST_FAILURE_COUNT = 2;
const CONSTRAINED_HOST_MAX_CONCURRENT = 1;
const CONSTRAINED_HOST_MAX_URLS = 4;
const GLOBAL_CONSTRAINED_URL_FACTOR = 0.6;
const GLOBAL_CONSTRAINED_MIN_URLS = 4;

const extractHost = (url: string): string => {
  try {
    return new URL(url).hostname.trim().toLowerCase();
  } catch {
    return "";
  }
};

export const isConstrainedImageHost = (url: string) => {
  return (
    imageFailureMemory.isHostSuppressed(url) ||
    imageFailureMemory.getHostFailureCount(url) >= CONSTRAINED_HOST_FAILURE_COUNT ||
    isLowTrustImageHost(url)
  );
};

export const getImagePreloadHostConcurrencyLimit = (
  url: string,
  defaultMaxConcurrent: number
) => {
  return isConstrainedImageHost(url)
    ? Math.min(defaultMaxConcurrent, CONSTRAINED_HOST_MAX_CONCURRENT)
    : defaultMaxConcurrent;
};

type BuildImagePreloadPlanArgs = {
  urls: string[];
  maxConcurrent: number;
  maxUrls: number;
};

export type ImagePreloadPlan = {
  candidateUrls: string[];
  maxConcurrent: number;
  constrainedHosts: string[];
};

export const buildImagePreloadPlan = ({
  urls,
  maxConcurrent,
  maxUrls,
}: BuildImagePreloadPlanArgs): ImagePreloadPlan => {
  const constrainedHosts = Array.from(
    new Set(
      urls
        .filter((url) => isConstrainedImageHost(url))
        .map((url) => extractHost(url))
        .filter(Boolean)
    )
  );

  const allCandidatesConstrained =
    urls.length > 0 && urls.every((url) => isConstrainedImageHost(url));

  const adjustedMaxConcurrent = allCandidatesConstrained
    ? Math.min(maxConcurrent, CONSTRAINED_HOST_MAX_CONCURRENT)
    : maxConcurrent;

  const adjustedMaxUrls = allCandidatesConstrained
    ? Math.max(
        adjustedMaxConcurrent,
        Math.min(
          maxUrls,
          Math.max(
            GLOBAL_CONSTRAINED_MIN_URLS,
            Math.floor(maxUrls * GLOBAL_CONSTRAINED_URL_FACTOR)
          )
        )
      )
    : maxUrls;

  const constrainedCounts = new Map<string, number>();
  const candidateUrls: string[] = [];

  for (const url of urls) {
    if (candidateUrls.length >= adjustedMaxUrls) {
      break;
    }

    const host = extractHost(url);
    if (host && isConstrainedImageHost(url)) {
      const count = constrainedCounts.get(host) ?? 0;
      if (count >= CONSTRAINED_HOST_MAX_URLS) {
        continue;
      }
      constrainedCounts.set(host, count + 1);
    }

    candidateUrls.push(url);
  }

  return {
    candidateUrls,
    maxConcurrent: adjustedMaxConcurrent,
    constrainedHosts,
  };
};
