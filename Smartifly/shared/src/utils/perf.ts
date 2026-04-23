import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { configurePrefetch } from './image';

export type PerfTier = 'low' | 'normal' | 'high';

export type PerfProfile = {
  tier: PerfTier;
  home: {
    drawDistance: number;
  };
  rails: {
    windowSize: number;
    initialNumToRender: number;
    maxToRenderPerBatch: number;
    updateCellsBatchingPeriod: number;
  };
  continueRails: {
    windowSize: number;
    initialNumToRender: number;
    maxToRenderPerBatch: number;
    updateCellsBatchingPeriod: number;
  };
  grid: {
    initialRows: number;
    maxRenderBatchRows: number;
    windowSize: number;
    updateCellsBatchingPeriod: number;
  };
  categoryList: {
    initialNumToRender: number;
    maxToRenderPerBatch: number;
    windowSize: number;
  };
  /** Whether to render SVG gradients on cards (expensive on low-end GPUs) */
  enableSvgGradients: boolean;
  /** Whether to render focus glow/shadow/elevation (expensive on low-end GPUs) */
  enableFocusGlow: boolean;
  /** Image quality tier — controls thumbnail resolution selection */
  imageQuality: 'low' | 'normal';
  /** Max concurrent image prefetches */
  prefetchConcurrency: number;
  /** Image cache limit (number of URIs to track) */
  imageCacheLimit: number;
};

const PERF_PROFILES: Record<PerfTier, PerfProfile> = {
  low: {
    tier: 'low',
    home: { drawDistance: 600 },
    rails: { windowSize: 4, initialNumToRender: 5, maxToRenderPerBatch: 4, updateCellsBatchingPeriod: 24 },
    continueRails: { windowSize: 4, initialNumToRender: 5, maxToRenderPerBatch: 4, updateCellsBatchingPeriod: 24 },
    grid: { initialRows: 2, maxRenderBatchRows: 1, windowSize: 3, updateCellsBatchingPeriod: 32 },
    categoryList: { initialNumToRender: 8, maxToRenderPerBatch: 8, windowSize: 4 },
    enableSvgGradients: false,
    enableFocusGlow: false,
    imageQuality: 'low',
    prefetchConcurrency: 2,
    imageCacheLimit: 150,
  },
  normal: {
    tier: 'normal',
    home: { drawDistance: 900 },
    rails: { windowSize: 5, initialNumToRender: 7, maxToRenderPerBatch: 5, updateCellsBatchingPeriod: 16 },
    continueRails: { windowSize: 5, initialNumToRender: 6, maxToRenderPerBatch: 5, updateCellsBatchingPeriod: 16 },
    grid: { initialRows: 3, maxRenderBatchRows: 2, windowSize: 5, updateCellsBatchingPeriod: 16 },
    categoryList: { initialNumToRender: 12, maxToRenderPerBatch: 12, windowSize: 5 },
    enableSvgGradients: true,
    enableFocusGlow: true,
    imageQuality: 'normal',
    prefetchConcurrency: 4,
    imageCacheLimit: 300,
  },
  high: {
    tier: 'high',
    home: { drawDistance: 1200 },
    rails: { windowSize: 7, initialNumToRender: 9, maxToRenderPerBatch: 7, updateCellsBatchingPeriod: 12 },
    continueRails: { windowSize: 7, initialNumToRender: 8, maxToRenderPerBatch: 6, updateCellsBatchingPeriod: 12 },
    grid: { initialRows: 4, maxRenderBatchRows: 3, windowSize: 7, updateCellsBatchingPeriod: 12 },
    categoryList: { initialNumToRender: 16, maxToRenderPerBatch: 16, windowSize: 7 },
    enableSvgGradients: true,
    enableFocusGlow: true,
    imageQuality: 'normal',
    prefetchConcurrency: 6,
    imageCacheLimit: 400,
  },
};

let cachedProfile: PerfProfile | null = null;
let pendingProfile: Promise<PerfProfile> | null = null;

const chooseTier = async (): Promise<PerfTier> => {
  try {
    const isEmulator = await DeviceInfo.isEmulator();
    if (isEmulator) return 'high';

    const totalMemory = await DeviceInfo.getTotalMemory();

    if (!Platform.isTV) {
      if (Platform.OS === 'android') {
        if (totalMemory && totalMemory < 3e9) return 'low';
        if (totalMemory && totalMemory < 6e9) return 'normal';
        return 'high';
      }

      if (totalMemory && totalMemory < 4e9) return 'low';
      return totalMemory && totalMemory > 6e9 ? 'high' : 'normal';
    }

    if (Platform.OS === 'android') {
      if (totalMemory && totalMemory < 2.5e9) return 'low';
      if (totalMemory && totalMemory < 4e9) return 'normal';
      return 'high';
    }

    if (totalMemory && totalMemory < 3e9) return 'low';
    return totalMemory && totalMemory > 6e9 ? 'high' : 'normal';
  } catch {
    return 'normal';
  }
};

export const getPerfProfile = async (): Promise<PerfProfile> => {
  if (cachedProfile) return cachedProfile;
  if (!pendingProfile) {
    pendingProfile = chooseTier().then((tier) => {
      cachedProfile = PERF_PROFILES[tier] || PERF_PROFILES.normal;
      // Configure image prefetching for the resolved tier
      configurePrefetch({
        cacheLimit: cachedProfile.imageCacheLimit,
        concurrency: cachedProfile.prefetchConcurrency,
      });
      return cachedProfile;
    });
  }
  return pendingProfile;
};

export const usePerfProfile = (): PerfProfile => {
  const [profile, setProfile] = useState<PerfProfile>(cachedProfile || PERF_PROFILES.normal);

  useEffect(() => {
    let isActive = true;
    getPerfProfile().then((next) => {
      if (!isActive) return;
      if (next.tier !== profile.tier) {
        setProfile(next);
      }
    });
    return () => {
      isActive = false;
    };
  }, [profile.tier]);

  return profile;
};
