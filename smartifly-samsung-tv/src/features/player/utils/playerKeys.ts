export type TizenHwKeyEvent = Event & {
  keyName?: string;
};

const BACK_KEYS = new Set(["Backspace", "Escape", "BrowserBack", "GoBack"]);

export const isBackKey = (event: KeyboardEvent) =>
  BACK_KEYS.has(event.key) || event.keyCode === 10009;
