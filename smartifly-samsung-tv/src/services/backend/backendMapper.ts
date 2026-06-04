import { AppError } from "../../types/errors";
import type {
  DeviceActivationState,
  DeviceCheckResponse,
  DeviceCheckStatus,
  DeviceQrResponse,
  DeviceQrSession,
  PortalResolveResponse,
  ResolvedPortal,
} from "./backendTypes";

const DEVICE_STATES: DeviceActivationState[] = [
  "NO_DEVICE",
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "DISABLED",
  "BLOCKED",
  "BLACKLISTED",
  "BAD_REQUEST",
  "SERVER_ERROR",
];

const isDeviceActivationState = (
  value: string | undefined
): value is DeviceActivationState => {
  return value !== undefined && DEVICE_STATES.includes(value as DeviceActivationState);
};

export const backendMapper = {
  toResolvedPortal(data: PortalResolveResponse): ResolvedPortal {
    if (!data.success || !data.portal) {
      throw new AppError(
        "INVALID_SERVER_CODE",
        data.message || "Invalid server code"
      );
    }

    const portalCode = data.portal.portalCode?.trim();
    const baseUrl = data.portal.baseUrl?.trim();
    const name = data.portal.name?.trim();

    if (!portalCode || !baseUrl || !name) {
      throw new AppError("INVALID_RESPONSE", "Missing portal information");
    }

    return {
      portalCode,
      baseUrl,
      name,
    };
  },

  toDeviceQrSession(data: DeviceQrResponse): DeviceQrSession {
    if (!data.success) {
      throw new AppError(
        "SERVER_UNREACHABLE",
        data.reason || "Unable to generate activation code"
      );
    }

    const qrCode = data.qrCode?.trim();
    const webLink = data.webLink?.trim();
    const settingsCode = data.settingsCode?.trim();

    if (!qrCode || !webLink || !settingsCode) {
      throw new AppError("INVALID_RESPONSE", "Missing activation session details");
    }

    return {
      qrCode,
      webLink,
      settingsCode,
      token: data.token?.trim() || null,
      expiresIn: data.expiresIn?.trim() || null,
    };
  },

  toDeviceCheckStatus(data: DeviceCheckResponse): DeviceCheckStatus {
    const state = data.state?.trim();

    if (!data.success || !isDeviceActivationState(state)) {
      throw new AppError("INVALID_RESPONSE", "Invalid device activation response");
    }

    return {
      state,
      reason: data.reason?.trim() || "Activation pending",
      xtreamUser: data.license?.xtreamUser?.trim() || null,
      xtreamPass: data.license?.xtreamPass?.trim() || null,
      serverUrl: data.license?.server?.url?.trim() || null,
      serverName: data.license?.server?.name?.trim() || null,
    };
  },
};
