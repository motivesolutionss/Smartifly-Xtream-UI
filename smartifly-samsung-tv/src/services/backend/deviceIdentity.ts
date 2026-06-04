import { localStorageService } from "../../storage/localStorageService";
import type { DeviceIdentityPayload } from "./backendTypes";

const DEVICE_IDENTITY_KEY = "smartifly_device_identity";
const DEFAULT_APP_VERSION = "0.1.0";

type TizenWindow = Window & {
  tizen?: {
    application?: {
      getCurrentApplication?: () => {
        appInfo?: {
          version?: string;
        };
      };
    };
    systeminfo?: {
      getCapability?: (key: string) => string;
    };
  };
  webapis?: {
    productinfo?: {
      getDuid?: () => string;
      getModel?: () => string;
      getRealModel?: () => string;
      getModelCode?: () => string;
      getVersion?: () => string;
    };
  };
};

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const safeCall = <T>(read: () => T): T | null => {
  try {
    return read();
  } catch {
    return null;
  }
};

const sanitizeDeviceId = (value: string) => {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
};

const buildFallbackDeviceId = () => {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `smartifly-${Date.now()}`;

  return `tizen-${sanitizeDeviceId(randomId)}`;
};

const readRuntimeIdentity = (): Omit<DeviceIdentityPayload, "deviceId"> & {
  preferredDeviceId: string | null;
} => {
  const tizenWindow = window as TizenWindow;
  const productInfo = tizenWindow.webapis?.productinfo;
  const appInfo = safeCall(() =>
    tizenWindow.tizen?.application?.getCurrentApplication?.().appInfo
  );

  const duid =
    readString(safeCall(() => productInfo?.getDuid?.())) ??
    readString(safeCall(() => productInfo?.getModelCode?.()));
  const model =
    readString(safeCall(() => productInfo?.getRealModel?.())) ??
    readString(safeCall(() => productInfo?.getModel?.())) ??
    readString(safeCall(() =>
      tizenWindow.tizen?.systeminfo?.getCapability?.(
        "http://tizen.org/system/model_name"
      )
    ));
  const osVersion =
    readString(safeCall(() => productInfo?.getVersion?.())) ??
    readString(safeCall(() =>
      tizenWindow.tizen?.systeminfo?.getCapability?.(
        "http://tizen.org/feature/platform.version"
      )
    ));
  const appVersion =
    readString(appInfo?.version) ??
    readString(import.meta.env.VITE_APP_VERSION) ??
    DEFAULT_APP_VERSION;

  return {
    preferredDeviceId: duid ? `tizen-${sanitizeDeviceId(duid)}` : null,
    mac: null,
    brand: "Samsung",
    model,
    serial: duid,
    platform: "TIZEN",
    appVersion,
    osVersion,
  };
};

export const getOrCreateDeviceIdentity = (): DeviceIdentityPayload => {
  const stored = localStorageService.get<DeviceIdentityPayload>(DEVICE_IDENTITY_KEY);
  const runtime = readRuntimeIdentity();

  const deviceIdentity: DeviceIdentityPayload = {
    deviceId:
      stored?.deviceId ||
      runtime.preferredDeviceId ||
      buildFallbackDeviceId(),
    mac: stored?.mac ?? runtime.mac,
    brand: runtime.brand ?? stored?.brand ?? "Samsung",
    model: runtime.model ?? stored?.model ?? null,
    serial: runtime.serial ?? stored?.serial ?? null,
    platform: "TIZEN",
    appVersion: runtime.appVersion ?? stored?.appVersion ?? DEFAULT_APP_VERSION,
    osVersion: runtime.osVersion ?? stored?.osVersion ?? null,
  };

  localStorageService.set(DEVICE_IDENTITY_KEY, deviceIdentity);
  return deviceIdentity;
};
