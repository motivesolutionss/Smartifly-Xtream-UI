import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  it("throws TIMEOUT when the internal timeout aborts the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      })
    );

    await expect(fetchWithTimeout("https://example.com", {}, 5)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("preserves external AbortError cancellations without converting them to TIMEOUT", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      })
    );

    const controller = new AbortController();
    const request = fetchWithTimeout(
      "https://example.com",
      { signal: controller.signal },
      1000
    );
    controller.abort();

    await expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
