import { resolveHomePerformanceTier, type HomePerformanceTier } from "./homeAdaptivePolicy";

type HomeRenderPolicy = {
  initialMountedRails: number;
  mountedRailBatchSize: number;
  activeRailLookahead: number;
  initialImageRailCount: number;
  initialRailItems: number;
  activeRailItemLookahead: number;
};

const HOME_RENDER_POLICY_BY_TIER: Record<HomePerformanceTier, HomeRenderPolicy> = {
  low: {
    initialMountedRails: 2,
    mountedRailBatchSize: 1,
    activeRailLookahead: 2,
    initialImageRailCount: 2,
    initialRailItems: 6,
    activeRailItemLookahead: 4,
  },
  medium: {
    initialMountedRails: 3,
    mountedRailBatchSize: 1,
    activeRailLookahead: 2,
    initialImageRailCount: 2,
    initialRailItems: 7,
    activeRailItemLookahead: 5,
  },
  high: {
    initialMountedRails: 3,
    mountedRailBatchSize: 1,
    activeRailLookahead: 3,
    initialImageRailCount: 2,
    initialRailItems: 7,
    activeRailItemLookahead: 6,
  },
};

export const resolveHomeRenderPolicy = (
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) => HOME_RENDER_POLICY_BY_TIER[tier];

export const getInitialMountedRailCount = (
  totalRails: number,
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) => Math.max(0, Math.min(totalRails, resolveHomeRenderPolicy(tier).initialMountedRails));

export const getInitialImageRailCount = (
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) => resolveHomeRenderPolicy(tier).initialImageRailCount;

export const getInitialRailItemCount = (
  totalItems: number,
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) => Math.max(0, Math.min(totalItems, resolveHomeRenderPolicy(tier).initialRailItems));

export const getProgressiveMountedRailCount = (
  currentCount: number,
  totalRails: number,
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) =>
  Math.max(
    0,
    Math.min(totalRails, currentCount + resolveHomeRenderPolicy(tier).mountedRailBatchSize)
  );

export const getFocusedMountedRailCount = (
  currentCount: number,
  activeRailIndex: number,
  totalRails: number,
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) =>
  Math.max(
    0,
    Math.min(
      totalRails,
      Math.max(currentCount, activeRailIndex + resolveHomeRenderPolicy(tier).activeRailLookahead)
    )
  );

export const getActiveRailItemCount = (
  totalItems: number,
  activeItemIndex: number,
  tier: HomePerformanceTier = resolveHomePerformanceTier()
) => {
  const policy = resolveHomeRenderPolicy(tier);
  const initialItemCount = getInitialRailItemCount(totalItems, tier);
  return Math.max(
    0,
    Math.min(
      totalItems,
      Math.max(initialItemCount, activeItemIndex + policy.activeRailItemLookahead + 1)
    )
  );
};
