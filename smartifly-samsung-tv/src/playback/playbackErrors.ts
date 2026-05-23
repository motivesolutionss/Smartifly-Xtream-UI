import { AppError } from "../types/errors";

const stringifyError = (error: unknown) => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error ?? "");
};

const looksLikeTimeout = (text: string) => /timeout|timed out|time out/i.test(text);
const looksLikeNetworkIssue = (text: string) =>
  /network|connection|host|unreachable|econn|dns|offline|refused/i.test(text);
const looksLikeUnsupported = (text: string) =>
  /not supported|unsupported|codec|format|demux|container|mime/i.test(text);
const looksLikeForbidden = (text: string) =>
  /403|401|forbidden|unauthorized|invalid token|expired token/i.test(text);

export const mapPlaybackError = (error: unknown) => {
  if (error instanceof AppError) return error;

  const text = stringifyError(error);

  if (looksLikeTimeout(text)) {
    return new AppError(
      "PLAYBACK_FAILED",
      "Playback timed out. Please check your connection and try again.",
      error
    );
  }

  if (looksLikeNetworkIssue(text)) {
    return new AppError(
      "PLAYBACK_FAILED",
      "Unable to reach the stream server. Please try another stream.",
      error
    );
  }

  if (looksLikeForbidden(text)) {
    return new AppError(
      "PLAYBACK_FAILED",
      "This stream is currently not authorized for your account.",
      error
    );
  }

  if (looksLikeUnsupported(text)) {
    return new AppError(
      "PLAYBACK_FAILED",
      "This stream format is not supported on this TV.",
      error
    );
  }

  return new AppError(
    "PLAYBACK_FAILED",
    "This stream is currently unavailable. Please try again.",
    error
  );
};
