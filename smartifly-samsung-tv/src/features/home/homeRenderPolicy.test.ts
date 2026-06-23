import { describe, expect, it } from "vitest";
import {
  getActiveRailItemCount,
  getFocusedMountedRailCount,
  getInitialImageRailCount,
  getInitialRailItemCount,
  getInitialMountedRailCount,
  getProgressiveMountedRailCount,
  resolveHomeRenderPolicy,
} from "./homeRenderPolicy";

describe("homeRenderPolicy", () => {
  it("uses a smaller initial Home mount budget on lower tiers", () => {
    expect(getInitialMountedRailCount(0, "low")).toBe(0);
    expect(getInitialMountedRailCount(2, "low")).toBe(2);
    expect(getInitialMountedRailCount(9, "low")).toBe(2);
    expect(getInitialMountedRailCount(9, "medium")).toBe(3);
    expect(getInitialMountedRailCount(9, "high")).toBe(3);
  });

  it("progressively mounts rails in tier-appropriate batches", () => {
    expect(getProgressiveMountedRailCount(0, 9, "low")).toBe(1);
    expect(getProgressiveMountedRailCount(3, 9, "medium")).toBe(4);
    expect(getProgressiveMountedRailCount(8, 9, "high")).toBe(9);
  });

  it("expands the mounted window when focus approaches the bottom", () => {
    expect(getFocusedMountedRailCount(2, 0, 9, "low")).toBe(2);
    expect(getFocusedMountedRailCount(3, 3, 9, "medium")).toBe(5);
    expect(getFocusedMountedRailCount(6, 8, 9, "high")).toBe(9);
  });

  it("keeps initial image work tighter than full content work on startup", () => {
    expect(getInitialImageRailCount("low")).toBe(2);
    expect(getInitialImageRailCount("medium")).toBe(2);
    expect(getInitialImageRailCount("high")).toBe(2);
  });

  it("limits initial card mounts per rail on startup", () => {
    expect(getInitialRailItemCount(4, "low")).toBe(4);
    expect(getInitialRailItemCount(12, "low")).toBe(6);
    expect(getInitialRailItemCount(12, "medium")).toBe(7);
    expect(getInitialRailItemCount(12, "high")).toBe(7);
  });

  it("expands the active rail item window as focus moves deeper into the row", () => {
    expect(getActiveRailItemCount(12, 0, "low")).toBe(6);
    expect(getActiveRailItemCount(12, 4, "low")).toBe(9);
    expect(getActiveRailItemCount(20, 8, "medium")).toBe(14);
    expect(getActiveRailItemCount(10, 8, "high")).toBe(10);
  });

  it("exposes the resolved tier policy for startup tuning", () => {
    expect(resolveHomeRenderPolicy("low")).toEqual({
      initialMountedRails: 2,
      mountedRailBatchSize: 1,
      activeRailLookahead: 2,
      initialImageRailCount: 2,
      initialRailItems: 6,
      activeRailItemLookahead: 4,
    });
  });
});
