import { AppError } from "../types/errors";

const getErrorName = (error: unknown) => {
  return error && typeof error === "object" && "name" in error
    ? String(error.name)
    : "";
};

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> => {
  const controller = new AbortController();
  const upstreamSignal = options.signal;
  let didTimeout = false;
  let detachUpstreamAbort: (() => void) | null = null;

  if (upstreamSignal) {
    const handleUpstreamAbort = () => {
      controller.abort(
        upstreamSignal instanceof AbortSignal ? upstreamSignal.reason : undefined
      );
    };

    if (upstreamSignal.aborted) {
      handleUpstreamAbort();
    } else {
      upstreamSignal.addEventListener("abort", handleUpstreamAbort, { once: true });
      detachUpstreamAbort = () => {
        upstreamSignal.removeEventListener("abort", handleUpstreamAbort);
      };
    }
  }

  const id = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    detachUpstreamAbort?.();
    return response;
  } catch (error: unknown) {
    clearTimeout(id);
    detachUpstreamAbort?.();
    if (getErrorName(error) === "AbortError") {
      if (didTimeout) {
        throw new AppError("TIMEOUT", "Request timed out");
      }
      throw error;
    }
    throw error;
  }
};
