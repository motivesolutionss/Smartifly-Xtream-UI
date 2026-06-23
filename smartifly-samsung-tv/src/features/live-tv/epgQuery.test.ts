import { describe, expect, it } from "vitest";
import {
  fillShortEpgGaps,
  parseShortEpgItems,
  sliceShortEpgToWindow,
  type ParsedShortEpgItem,
} from "./epgQuery";
import type { AppEpgItem } from "../../types/appModels";

const createProgram = (
  startIso: string,
  endIso: string,
  title: string
): AppEpgItem => ({
  title,
  start: startIso,
  end: endIso,
});

const createParsedProgram = (
  startMs: number,
  endMs: number,
  title: string
): ParsedShortEpgItem => ({
  title,
  start: new Date(startMs).toISOString(),
  end: new Date(endMs).toISOString(),
  startMs,
  endMs,
});

describe("parseShortEpgItems", () => {
  it("inserts a synthetic gap item when consecutive programs have empty time between them", () => {
    const parsed = parseShortEpgItems([
      createProgram("2026-06-09T10:00:00.000Z", "2026-06-09T11:00:00.000Z", "Morning Show"),
      createProgram("2026-06-09T11:30:00.000Z", "2026-06-09T12:00:00.000Z", "Midday News"),
    ]);

    expect(parsed).toHaveLength(3);
    expect(parsed[1]).toMatchObject({
      title: "No Program Info",
      synthetic: true,
      startMs: Date.parse("2026-06-09T11:00:00.000Z"),
      endMs: Date.parse("2026-06-09T11:30:00.000Z"),
    });
  });

  it("does not insert a gap for touching or overlapping programs", () => {
    const parsed = parseShortEpgItems([
      createProgram("2026-06-09T10:00:00.000Z", "2026-06-09T11:00:00.000Z", "Morning Show"),
      createProgram("2026-06-09T11:00:00.000Z", "2026-06-09T12:00:00.000Z", "News"),
      createProgram("2026-06-09T11:45:00.000Z", "2026-06-09T12:30:00.000Z", "Sports"),
    ]);

    expect(parsed.map((item) => item.title)).toEqual([
      "Morning Show",
      "News",
      "Sports",
    ]);
  });
});

describe("fillShortEpgGaps", () => {
  it("returns the original list when there are fewer than two items", () => {
    const program = createParsedProgram(
      Date.parse("2026-06-09T10:00:00.000Z"),
      Date.parse("2026-06-09T11:00:00.000Z"),
      "Morning Show"
    );

    expect(fillShortEpgGaps([program])).toEqual([program]);
  });
});

describe("sliceShortEpgToWindow", () => {
  it("preserves synthetic gap items inside the visible window", () => {
    const parsed = parseShortEpgItems([
      createProgram("2026-06-09T10:00:00.000Z", "2026-06-09T11:00:00.000Z", "Morning Show"),
      createProgram("2026-06-09T11:30:00.000Z", "2026-06-09T12:00:00.000Z", "Midday News"),
    ]);

    const sliced = sliceShortEpgToWindow(
      parsed,
      Date.parse("2026-06-09T10:30:00.000Z"),
      Date.parse("2026-06-09T11:45:00.000Z"),
      10
    );

    expect(sliced.map((item) => item.title)).toEqual([
      "Morning Show",
      "No Program Info",
      "Midday News",
    ]);
    expect(sliced[1]?.synthetic).toBe(true);
  });
});
