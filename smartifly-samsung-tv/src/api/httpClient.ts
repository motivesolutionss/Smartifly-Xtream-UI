import { fetchWithTimeout } from "./fetchWithTimeout";
import { withRetry } from "./retry";
import { AppError } from "../types/errors";
import { logger } from "../utils/logger";

type ErrorResponseMapper = (response: Response, data: unknown) => AppError | null;

type JsonRequestOptions = Omit<RequestInit, "body"> & {
  retries?: number;
  body?: unknown;
  mapErrorResponse?: ErrorResponseMapper;
};

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
  request: async <T>(url: string, options: JsonRequestOptions = {}): Promise<T> => {
    const safeUrl = redactUrl(url);
    const {
      retries = 2,
      body,
      headers,
      method = "GET",
      mapErrorResponse,
      ...requestInit
    } = options;

    const finalHeaders =
      body === undefined
        ? headers
        : {
            "Content-Type": "application/json",
            ...headers,
          };

    return withRetry(async () => {
      logger.info(`${method} ${safeUrl}`);
      try {
        const response = await fetchWithTimeout(url, {
          ...requestInit,
          method,
          headers: finalHeaders,
          body: body === undefined ? undefined : JSON.stringify(body),
        });

        let data: unknown = null;
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (error) {
            throw new AppError("INVALID_RESPONSE", "Invalid JSON response", error);
          }
        }

        if (!response.ok) {
          const mappedError = mapErrorResponse?.(response, data);
          if (mappedError) {
            throw mappedError;
          }

          throw new AppError(
            "SERVER_UNREACHABLE",
            `HTTP error! status: ${response.status}`
          );
        }

        return data as T;
      } catch (error: unknown) {
        if (error instanceof AppError) throw error;

        logger.error(`HTTP ${method} failed: ${safeUrl}`, error);
        throw new AppError(
          "SERVER_UNREACHABLE",
          "Unable to connect to the server",
          error
        );
      }
    }, retries);
  },

  get: async <T>(url: string, retries: number = 2): Promise<T> => {
    return httpClient.request<T>(url, { method: "GET", retries });
  },

  post: async <T>(url: string, body?: unknown, retries: number = 2): Promise<T> => {
    return httpClient.request<T>(url, { method: "POST", body, retries });
  },

  put: async <T>(url: string, body?: unknown, retries: number = 2): Promise<T> => {
    return httpClient.request<T>(url, { method: "PUT", body, retries });
  },
};
