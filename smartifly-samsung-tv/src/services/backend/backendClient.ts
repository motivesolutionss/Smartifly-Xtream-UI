import { httpClient } from "../../api/httpClient";
import { AppError } from "../../types/errors";
import { normalizeServerUrl } from "../../utils/normalizeServerUrl";
import { backendMapper } from "./backendMapper";
import { getBackendBaseUrl } from "./backendConfig";
import type {
  DeviceCheckResponse,
  DeviceCheckStatus,
  DeviceIdentityPayload,
  DeviceQrResponse,
  DeviceQrSession,
  PortalResolveResponse,
  ResolvedPortal,
} from "./backendTypes";

export class BackendClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = getBackendBaseUrl()) {
    this.baseUrl = normalizeServerUrl(baseUrl);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  async resolvePortal(code: string): Promise<ResolvedPortal> {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new AppError("INVALID_SERVER_CODE", "Server code is required");
    }

    const url = new URL("/v1/public/portal/validate", this.baseUrl);
    url.searchParams.set("code", trimmedCode);

    const response = await httpClient.request<PortalResolveResponse>(url.toString(), {
      method: "GET",
      retries: 1,
      mapErrorResponse: (httpResponse, data) => {
        if (httpResponse.status === 400 || httpResponse.status === 404) {
          const message =
            data && typeof data === "object" && "message" in data
              ? String(data.message)
              : "Invalid server code";
          return new AppError("INVALID_SERVER_CODE", message);
        }
        return null;
      },
    });

    return backendMapper.toResolvedPortal(response);
  }

  async generateDeviceQr(
    deviceIdentity: DeviceIdentityPayload
  ): Promise<DeviceQrSession> {
    const response = await httpClient.post<DeviceQrResponse>(
      new URL("/v1/public/qr/generate", this.baseUrl).toString(),
      deviceIdentity,
      1
    );

    return backendMapper.toDeviceQrSession(response);
  }

  async checkDevice(
    identifiers: Pick<DeviceIdentityPayload, "deviceId" | "mac">
  ): Promise<DeviceCheckStatus> {
    const url = new URL("/v1/public/device/check", this.baseUrl);
    url.searchParams.set("deviceId", identifiers.deviceId);
    if (identifiers.mac) {
      url.searchParams.set("mac", identifiers.mac);
    }

    const response = await httpClient.request<DeviceCheckResponse>(url.toString(), {
      method: "GET",
      retries: 1,
    });

    return backendMapper.toDeviceCheckStatus(response);
  }
}
