export type ScreenID =
  | "SPLASH"
  | "LOGIN"
  | "HOME"
  | "LIVE_CATEGORIES"
  | "LIVE_CHANNELS"
  | "VOD_CATEGORIES"
  | "VOD_STREAMS"
  | "VOD_DETAILS"
  | "SERIES_CATEGORIES"
  | "SERIES_LIST"
  | "SERIES_DETAILS"
  | "PLAYER"
  | "SETTINGS";

export type NavigationState = {
  currentScreen: ScreenID;
  history: ScreenID[];
  params?: Record<string, unknown>;
};
