const IMAGE_WARM_MEMORY_CAP = 1200;
const warmedImages = new Set<string>();
const warmedImageQueue: string[] = [];

const rememberWarmImage = (url: string) => {
  if (warmedImages.has(url)) {
    return;
  }

  warmedImages.add(url);
  warmedImageQueue.push(url);

  while (warmedImageQueue.length > IMAGE_WARM_MEMORY_CAP) {
    const evictedUrl = warmedImageQueue.shift();
    if (!evictedUrl) {
      break;
    }
    warmedImages.delete(evictedUrl);
  }
};

export const imageWarmMemory = {
  hasWarm(url?: string) {
    return Boolean(url && warmedImages.has(url));
  },
  markWarm(url?: string) {
    if (!url) return;
    rememberWarmImage(url);
  },
  clear() {
    warmedImages.clear();
    warmedImageQueue.length = 0;
  },
};
