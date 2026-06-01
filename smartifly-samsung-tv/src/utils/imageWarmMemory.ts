const warmedImages = new Set<string>();

export const imageWarmMemory = {
  hasWarm(url?: string) {
    return Boolean(url && warmedImages.has(url));
  },
  markWarm(url?: string) {
    if (!url) return;
    warmedImages.add(url);
  },
  clear() {
    warmedImages.clear();
  },
};
