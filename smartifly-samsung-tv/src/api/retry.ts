import { AppError } from "../types/errors";

const MIN_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 8_000;

const isRetryableError = (error: unknown) => {
  if (!(error instanceof AppError)) return true;

  return error.code === "SERVER_UNREACHABLE" || error.code === "TIMEOUT";
};

export const withRetry = async <T>(
  fn: (attempt: number) => Promise<T>,
  retries: number = 2,
  delay: number = MIN_RETRY_DELAY_MS,
  hooks?: {
    onRetry?: (error: unknown, nextAttempt: number, delayMs: number) => void;
  }
): Promise<T> => {
  try {
    return await fn(1);
  } catch (error) {
    if (retries <= 0 || !isRetryableError(error)) throw error;
    const clampedDelay = Math.min(delay, MAX_RETRY_DELAY_MS);
    hooks?.onRetry?.(error, 2, clampedDelay);
    await new Promise((resolve) => setTimeout(resolve, clampedDelay));
    return withRetry(
      async (attempt) => fn(attempt + 1),
      retries - 1,
      clampedDelay * 2,
      {
        onRetry: (nextError, nextAttempt, nextDelayMs) => {
          hooks?.onRetry?.(nextError, nextAttempt + 1, nextDelayMs);
        },
      }
    );
  }
};
