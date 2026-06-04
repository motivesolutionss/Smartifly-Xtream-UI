export type ResolvedPortal = {
  portalCode: string;
  baseUrl: string;
  name: string;
};

export type DeviceActivationState =
  | "NO_DEVICE"
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "DISABLED"
  | "BLOCKED"
  | "BLACKLISTED"
  | "BAD_REQUEST"
  | "SERVER_ERROR";

export type DeviceIdentityPayload = {
  deviceId: string;
  mac: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  platform: "TIZEN";
  appVersion: string | null;
  osVersion: string | null;
};

export type DeviceQrSession = {
  qrCode: string;
  webLink: string;
  settingsCode: string;
  token: string | null;
  expiresIn: string | null;
};

export type DeviceCheckStatus = {
  state: DeviceActivationState;
  reason: string;
  xtreamUser: string | null;
  xtreamPass: string | null;
  serverUrl: string | null;
  serverName: string | null;
};

export type PortalResolveResponse = {
  success: boolean;
  message?: string;
  portal?: {
    portalCode?: string;
    baseUrl?: string;
    name?: string;
  };
};

export type DeviceQrResponse = {
  success: boolean;
  state?: string;
  reason?: string;
  qrCode?: string;
  webLink?: string;
  token?: string;
  settingsCode?: string;
  expiresIn?: string;
};

export type DeviceCheckResponse = {
  success: boolean;
  valid?: boolean;
  exists?: boolean;
  state?: string;
  statusCode?: string;
  reason?: string;
  license?: {
    xtreamUser?: string | null;
    xtreamPass?: string | null;
    server?: {
      name?: string | null;
      url?: string | null;
    } | null;
  } | null;
};
