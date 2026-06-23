import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "./httpClient";

describe("httpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts repaired truncated JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"success":true,"data":[1,2,3]', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const result = await httpClient.get<{ success: boolean; data: number[] }>(
      "https://example.com/api",
      0
    );

    expect(result).toEqual({ success: true, data: [1, 2, 3] });
  });

  it("keeps throwing INVALID_RESPONSE for unrecoverable payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>bad gateway</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )
    );

    await expect(httpClient.get("https://example.com/api", 0)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
