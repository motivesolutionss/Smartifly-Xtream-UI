import { describe, expect, it } from "vitest";
import {
  buildEpgTimeSlots,
  EPG_SLOT_DURATION_MS,
  getCurrentEpgWindowAnchorMs,
  getMsUntilNextEpgWindow,
} from "./epgWindow";

describe("getCurrentEpgWindowAnchorMs", () => {
  it("rounds down to the start of the current half-hour window", () => {
    expect(
      getCurrentEpgWindowAnchorMs(Date.parse("2026-06-09T10:12:34.000Z"))
    ).toBe(Date.parse("2026-06-09T10:00:00.000Z"));

    expect(
      getCurrentEpgWindowAnchorMs(Date.parse("2026-06-09T10:47:34.000Z"))
    ).toBe(Date.parse("2026-06-09T10:30:00.000Z"));
  });
});

describe("buildEpgTimeSlots", () => {
  it("builds evenly spaced half-hour slots from the anchor", () => {
    const anchorMs = Date.parse("2026-06-09T10:30:00.000Z");
    const slots = buildEpgTimeSlots(anchorMs, 3);

    expect(slots.map((slot) => slot.toISOString())).toEqual([
      "2026-06-09T10:30:00.000Z",
      "2026-06-09T11:00:00.000Z",
      "2026-06-09T11:30:00.000Z",
    ]);
  });
});

describe("getMsUntilNextEpgWindow", () => {
  it("returns the remaining time until the next half-hour boundary", () => {
    expect(
      getMsUntilNextEpgWindow(Date.parse("2026-06-09T10:12:34.000Z"))
    ).toBe((17 * 60 + 26) * 1000);

    expect(
      getMsUntilNextEpgWindow(Date.parse("2026-06-09T10:47:34.000Z"))
    ).toBe((12 * 60 + 26) * 1000);
  });

  it("never returns zero or a negative delay", () => {
    expect(
      getMsUntilNextEpgWindow(Date.parse("2026-06-09T10:30:00.000Z"))
    ).toBeGreaterThan(0);
    expect(
      getMsUntilNextEpgWindow(Date.parse("2026-06-09T10:30:00.000Z"))
    ).toBeLessThanOrEqual(EPG_SLOT_DURATION_MS);
  });
});
