import { describe, expect, it } from "vitest";
import { parseJsonResponseText } from "./jsonResponseSanitizer";

describe("parseJsonResponseText", () => {
  it("returns valid JSON without marking it as repaired", () => {
    const result = parseJsonResponseText('{"success":true,"count":3}');

    expect(result.data).toEqual({ success: true, count: 3 });
    expect(result.repaired).toBe(false);
    expect(result.strategies).toEqual([]);
  });

  it("repairs truncated JSON by appending missing closers", () => {
    const result = parseJsonResponseText('{"success":true,"data":[1,2,3]');

    expect(result.data).toEqual({ success: true, data: [1, 2, 3] });
    expect(result.repaired).toBe(true);
    expect(result.strategies).toContain("append_missing_closers");
  });

  it("repairs invalid backslash escapes inside strings", () => {
    const result = parseJsonResponseText('{"message":"bad \\q escape"}');

    expect(result.data).toEqual({ message: "bad \\q escape" });
    expect(result.repaired).toBe(true);
    expect(result.strategies).toContain("escape_invalid_backslashes");
  });

  it("wraps plain-text error responses into a safe JSON envelope", () => {
    const result = parseJsonResponseText("Internal server error");

    expect(result.data).toEqual({
      success: false,
      error: "Invalid response",
      message: "Internal server error",
    });
    expect(result.repaired).toBe(true);
    expect(result.strategies).toEqual(["wrap_plain_text_error"]);
  });

  it("still rejects unrecoverable HTML responses", () => {
    expect(() => parseJsonResponseText("<html>gateway error</html>")).toThrow();
  });
});
