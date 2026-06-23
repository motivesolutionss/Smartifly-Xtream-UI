import { createContext } from "react";

export interface FocusController {
  getFocusedId: () => string | null;
  subscribe: (listener: () => void) => () => void;
  setFocus: (id: string | null) => void;
  setFocusScope: (prefixes: string[] | null, fallbackId?: string | null) => void;
  registerElement: (
    id: string,
    ref: HTMLElement,
    options?: { allowGlobalAutoFocus?: boolean }
  ) => void;
  unregisterElement: (id: string) => void;
}

export const FocusContext = createContext<FocusController | undefined>(undefined);
