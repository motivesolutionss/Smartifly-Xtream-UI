import { fetchWithTimeout } from "./fetchWithTimeout";
import { withRetry } from "./retry";
import { AppError } from "../types/errors";
import { logger } from "../utils/logger";

const redactUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.searchParams.has("username")) {
      parsedUrl.searchParams.set("username", "***");
    }
    if (parsedUrl.searchParams.has("password")) {
      parsedUrl.searchParams.set("password", "***");
    }
    return parsedUrl.toString();
  } catch {
    return "[invalid-url]";
  }
};

export const httpClient = {
  get: async <T>(url: string, retries: number = 2): Promise<T> => {
    const safeUrl = redactUrl(url);

    return withRetry(async () => {
      logger.info(`GET ${safeUrl}`);
      try {
        const response = await fetchWithTimeout(url);

        if (!response.ok) {
          throw new AppError(
            "SERVER_UNREACHABLE",
            `HTTP error! status: ${response.status}`
          );
        }

        let data: unknown;
        try {
          data = await response.json();
        } catch (error) {
          throw new AppError("INVALID_RESPONSE", "Invalid JSON response", error);
        }

        return data as T;
      } catch (error: unknown) {
        if (error instanceof AppError) throw error;

        logger.error(`HTTP GET failed: ${safeUrl}`, error);
        throw new AppError(
          "SERVER_UNREACHABLE",
          "Unable to connect to the server",
          error
        );
      }
    }, retries);
  },
};
