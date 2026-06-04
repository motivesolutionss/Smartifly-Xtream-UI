import { AppError, type AppErrorCode } from "../types/errors";

const errorMessages: Record<AppErrorCode, string> = {
  INVALID_SERVER_URL:
    "Invalid server URL. Please check the address and try again.",
  INVALID_SERVER_CODE:
    "Invalid server code. Please check the code and try again.",
  SERVER_UNREACHABLE:
    "Unable to connect to the server. Please check your connection and try again.",
  TIMEOUT:
    "The server took too long to respond. Please try again in a moment.",
  INVALID_CREDENTIALS:
    "Invalid username or password. Please check your playlist details.",
  ACCOUNT_EXPIRED:
    "Your account appears to be expired. Please contact your provider.",
  ACCOUNT_DISABLED:
    "Your account appears to be disabled. Please contact your provider.",
  EMPTY_CONTENT:
    "This playlist connected, but no Live TV content was found.",
  INVALID_RESPONSE:
    "The server returned an unexpected response. Please check your playlist details.",
  PLAYBACK_FAILED:
    "Playback failed. Please try another stream or try again later.",
  BACKEND_NOT_CONFIGURED:
    "This app is missing its backend configuration. Please contact support.",
  UNKNOWN:
    "Something went wrong. Please try again.",
};

export const getAppErrorCode = (error: unknown): AppErrorCode => {
  return error instanceof AppError ? error.code : "UNKNOWN";
};

export const getUserFriendlyErrorMessage = (error: unknown): string => {
  return errorMessages[getAppErrorCode(error)];
};

export const mapUnknownError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  return new AppError("UNKNOWN", "Unknown error", error);
};
