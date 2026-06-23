import { describe, expect, it } from "vitest";
import {
  getHomeHeroDetailEnableDelayMs,
  getHomePreparationNearPreloadDelayMs,
  getHomePreparationWarmPreloadDelayMs,
  getHomeRailNearPreloadDelayMs,
  getHomeRailPreloadEnableDelayMs,
  getHomeRailWarmPreloadDelayMs,
} from "./homeStartupPolicy";

describe("homeStartupPolicy", () => {
  it("defers hero detail less once the hero is already visually ready", () => {
    expect(getHomeHeroDetailEnableDelayMs("low", false)).toBe(1800);
    expect(getHomeHeroDetailEnableDelayMs("low", true)).toBe(500);
    expect(getHomeHeroDetailEnableDelayMs("medium", false)).toBe(1200);
    expect(getHomeHeroDetailEnableDelayMs("medium", true)).toBe(350);
    expect(getHomeHeroDetailEnableDelayMs("high", false)).toBe(700);
    expect(getHomeHeroDetailEnableDelayMs("high", true)).toBe(250);
  });

  it("keeps rail preload behind hero paint but still has a fallback start time", () => {
    expect(getHomeRailPreloadEnableDelayMs("low", false)).toBe(1800);
    expect(getHomeRailPreloadEnableDelayMs("low", true)).toBe(700);
    expect(getHomeRailPreloadEnableDelayMs("medium", false)).toBe(1200);
    expect(getHomeRailPreloadEnableDelayMs("medium", true)).toBe(500);
    expect(getHomeRailPreloadEnableDelayMs("high", false)).toBe(800);
    expect(getHomeRailPreloadEnableDelayMs("high", true)).toBe(300);
  });

  it("stages home preparation image buckets from near to warm", () => {
    expect(getHomePreparationNearPreloadDelayMs("low")).toBe(250);
    expect(getHomePreparationNearPreloadDelayMs("medium")).toBe(180);
    expect(getHomePreparationNearPreloadDelayMs("high")).toBe(120);

    expect(getHomePreparationWarmPreloadDelayMs("low")).toBe(900);
    expect(getHomePreparationWarmPreloadDelayMs("medium")).toBe(650);
    expect(getHomePreparationWarmPreloadDelayMs("high")).toBe(400);
  });

  it("keeps runtime rail warm preload behind critical and near buckets", () => {
    expect(getHomeRailNearPreloadDelayMs("low")).toBe(300);
    expect(getHomeRailNearPreloadDelayMs("medium")).toBe(220);
    expect(getHomeRailNearPreloadDelayMs("high")).toBe(140);

    expect(getHomeRailWarmPreloadDelayMs("low")).toBe(1100);
    expect(getHomeRailWarmPreloadDelayMs("medium")).toBe(800);
    expect(getHomeRailWarmPreloadDelayMs("high")).toBe(500);
  });
});
