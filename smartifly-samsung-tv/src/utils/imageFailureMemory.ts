const failedImages = new Set<string>();

export const imageFailureMemory = {
  hasFailed(url?: string) {
    return Boolean(url && failedImages.has(url));
  },
  markFailed(url?: string) {
    if (!url) return;
    failedImages.add(url);
  },
  clear() {
    failedImages.clear();
  },
};

