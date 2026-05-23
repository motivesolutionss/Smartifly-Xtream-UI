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
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: unknown) {
    clearTimeout(id);
    if (getErrorName(error) === "AbortError") {
      throw new AppError("TIMEOUT", "Request timed out");
    }
    throw error;
  }
};
