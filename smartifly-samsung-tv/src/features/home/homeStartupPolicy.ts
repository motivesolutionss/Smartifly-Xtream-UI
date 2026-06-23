import type { HomePerformanceTier } from "./homeAdaptivePolicy";

const HOME_HERO_DETAIL_FALLBACK_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 1800,
  medium: 1200,
  high: 700,
};

const HOME_HERO_DETAIL_POST_VISUAL_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 500,
  medium: 350,
  high: 250,
};

const HOME_RAIL_PRELOAD_FALLBACK_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 1800,
  medium: 1200,
  high: 800,
};

const HOME_RAIL_PRELOAD_POST_VISUAL_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 700,
  medium: 500,
  high: 300,
};

const HOME_PREPARATION_NEAR_PRELOAD_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 250,
  medium: 180,
  high: 120,
};

const HOME_PREPARATION_WARM_PRELOAD_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 900,
  medium: 650,
  high: 400,
};

const HOME_RAIL_NEAR_PRELOAD_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 300,
  medium: 220,
  high: 140,
};

const HOME_RAIL_WARM_PRELOAD_DELAY_MS_BY_TIER: Record<HomePerformanceTier, number> = {
  low: 1100,
  medium: 800,
  high: 500,
};

export const getHomeHeroDetailEnableDelayMs = (
  tier: HomePerformanceTier,
  hasHeroVisualReady: boolean
) =>
  hasHeroVisualReady
    ? HOME_HERO_DETAIL_POST_VISUAL_DELAY_MS_BY_TIER[tier]
    : HOME_HERO_DETAIL_FALLBACK_DELAY_MS_BY_TIER[tier];

export const getHomeRailPreloadEnableDelayMs = (
  tier: HomePerformanceTier,
  hasHeroVisualReady: boolean
) =>
  hasHeroVisualReady
    ? HOME_RAIL_PRELOAD_POST_VISUAL_DELAY_MS_BY_TIER[tier]
    : HOME_RAIL_PRELOAD_FALLBACK_DELAY_MS_BY_TIER[tier];

export const getHomePreparationNearPreloadDelayMs = (tier: HomePerformanceTier) =>
  HOME_PREPARATION_NEAR_PRELOAD_DELAY_MS_BY_TIER[tier];

export const getHomePreparationWarmPreloadDelayMs = (tier: HomePerformanceTier) =>
  HOME_PREPARATION_WARM_PRELOAD_DELAY_MS_BY_TIER[tier];

export const getHomeRailNearPreloadDelayMs = (tier: HomePerformanceTier) =>
  HOME_RAIL_NEAR_PRELOAD_DELAY_MS_BY_TIER[tier];

export const getHomeRailWarmPreloadDelayMs = (tier: HomePerformanceTier) =>
  HOME_RAIL_WARM_PRELOAD_DELAY_MS_BY_TIER[tier];
