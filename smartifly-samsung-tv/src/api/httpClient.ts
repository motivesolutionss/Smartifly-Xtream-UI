import { fetchWithTimeout } from "./fetchWithTimeout";
import { parseJsonResponseText } from "./jsonResponseSanitizer";
import {
  startTrackedRequest,
  type RequestInstrumentationMeta,
} from "./requestInstrumentation";
import { withRetry } from "./retry";
import { AppError } from "../types/errors";
import { logger } from "../utils/logger";

type ErrorResponseMapper = (response: Response, data: unknown) => AppError | null;

type JsonRequestOptions = Omit<RequestInit, "body"> & {
  retries?: number;
  body?: unknown;
  mapErrorResponse?: ErrorResponseMapper;
  meta?: RequestInstrumentationMeta;
  timeoutMs?: number;
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
    const {
      retries = 2,
      body,
      headers,
      meta,
      method = "GET",
      mapErrorResponse,
      timeoutMs = 15000,
      ...requestInit
    } = options;

    const finalHeaders =
      body === undefined
        ? headers
        : {
            "Content-Type": "application/json",
            ...headers,
          };

    const trackedRequest = startTrackedRequest({
      meta,
      method,
      retries,
      timeoutMs,
      url,
    });

    return withRetry(async (attempt) => {
      trackedRequest.beginAttempt(attempt);
      try {
        const response = await fetchWithTimeout(url, {
          ...requestInit,
          method,
          headers: finalHeaders,
          body: body === undefined ? undefined : JSON.stringify(body),
        }, timeoutMs);

        let data: unknown = null;
        const text = await response.text();
        if (text.trim()) {
          try {
            const parsed = parseJsonResponseText(text);
            data = parsed.data;
            if (parsed.repaired) {
              logger.warn("HTTP response repaired", {
                method,
                url: redactUrl(url),
                strategies: parsed.strategies,
              });
            }
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

        trackedRequest.succeed();
        return data as T;
      } catch (error: unknown) {
        if (error instanceof AppError) {
          throw error;
        }

        throw new AppError(
          "SERVER_UNREACHABLE",
          "Unable to connect to the server",
          error
        );
      }
    }, retries, undefined, {
      onRetry: (error, nextAttempt, delayMs) => {
        trackedRequest.retry(nextAttempt - 1, delayMs, error);
      },
    }).catch((error) => {
      trackedRequest.fail(error);
      throw error;
    });
  },

  get: async <T>(url: string, retries: number = 2, options: Omit<JsonRequestOptions, "method" | "body" | "retries"> = {}): Promise<T> => {
    return httpClient.request<T>(url, { ...options, method: "GET", retries });
  },

  post: async <T>(
    url: string,
    body?: unknown,
    retries: number = 2,
    options: Omit<JsonRequestOptions, "method" | "body" | "retries"> = {}
  ): Promise<T> => {
    return httpClient.request<T>(url, { ...options, method: "POST", body, retries });
  },

  put: async <T>(
    url: string,
    body?: unknown,
    retries: number = 2,
    options: Omit<JsonRequestOptions, "method" | "body" | "retries"> = {}
  ): Promise<T> => {
    return httpClient.request<T>(url, { ...options, method: "PUT", body, retries });
  },
};
