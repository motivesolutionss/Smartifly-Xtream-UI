import { AppError } from "../../types/errors";

const isTizenRuntime = () => {
  if (typeof navigator !== "undefined" && /tizen/i.test(navigator.userAgent)) {
    return true;
  }

  if (typeof window !== "undefined") {
    const runtimeWindow = window as Window & {
      tizen?: unknown;
      webapis?: unknown;
    };

    return Boolean(runtimeWindow.tizen || runtimeWindow.webapis);
  }

  return false;
};

export const getBackendBaseUrl = () => {
  const browserBaseUrl = import.meta.env.VITE_SMARTIFLY_BACKEND_URL?.trim();
  const emulatorBaseUrl =
    import.meta.env.VITE_SMARTIFLY_BACKEND_URL_EMULATOR?.trim();
  const baseUrl =
    isTizenRuntime() && emulatorBaseUrl ? emulatorBaseUrl : browserBaseUrl;

  if (!baseUrl) {
    throw new AppError(
      "BACKEND_NOT_CONFIGURED",
      "Missing VITE_SMARTIFLY_BACKEND_URL"
    );
  }

  return baseUrl;
};
