import { logger } from "./logger";

type TizenInputDevice = {
  registerKey?: (key: string) => void;
  unregisterKey?: (key: string) => void;
};

type TizenWindow = Window & {
  tizen?: {
    tvinputdevice?: TizenInputDevice;
  };
};

const OPTIONAL_KEYS = [
  "MediaPlayPause",
  "MediaPlay",
  "MediaPause",
  "MediaStop",
  "MediaFastForward",
  "MediaRewind",
  "ChannelUp",
  "ChannelDown",
];

export const registerTizenRemoteKeys = () => {
  const inputDevice = (window as TizenWindow).tizen?.tvinputdevice;
  if (!inputDevice?.registerKey) return;

  OPTIONAL_KEYS.forEach((key) => {
    try {
      inputDevice.registerKey?.(key);
    } catch (error) {
      logger.debug(`Failed to register optional key: ${key}`, error);
    }
  });
};

