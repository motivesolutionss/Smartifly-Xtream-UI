import { AppError } from "../types/errors";

const isRetryableError = (error: unknown) => {
  if (!(error instanceof AppError)) return true;

  return error.code === "SERVER_UNREACHABLE" || error.code === "TIMEOUT";
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0 || !isRetryableError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};
