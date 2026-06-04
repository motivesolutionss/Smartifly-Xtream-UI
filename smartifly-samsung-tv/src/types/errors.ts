export type AppErrorCode =
  | "INVALID_SERVER_URL"
  | "INVALID_SERVER_CODE"
  | "SERVER_UNREACHABLE"
  | "TIMEOUT"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_EXPIRED"
  | "ACCOUNT_DISABLED"
  | "EMPTY_CONTENT"
  | "INVALID_RESPONSE"
  | "PLAYBACK_FAILED"
  | "BACKEND_NOT_CONFIGURED"
  | "UNKNOWN";

export class AppError extends Error {
  code: AppErrorCode;
  originalError?: unknown;

  constructor(code: AppErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.code = code;
    this.originalError = originalError;
    this.name = "AppError";
  }
}
