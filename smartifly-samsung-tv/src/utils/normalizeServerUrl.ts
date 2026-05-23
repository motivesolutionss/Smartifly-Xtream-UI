import { AppError } from "../types/errors";

export const normalizeServerUrl = (url: string): string => {
  let normalized = url.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new AppError("INVALID_SERVER_URL", "Server URL is required");
  }

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `http://${normalized}`;
  }

  try {
    const parsedUrl = new URL(normalized);
    if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      throw new Error("Unsupported protocol or missing host");
    }

    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString().replace(/\/+$/, "");
  } catch (error) {
    throw new AppError("INVALID_SERVER_URL", "Invalid server URL", error);
  }

};
