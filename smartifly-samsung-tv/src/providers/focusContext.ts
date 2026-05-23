import { createContext } from "react";

export interface FocusContextType {
  focusedId: string | null;
  setFocus: (id: string | null) => void;
  setFocusScope: (prefixes: string[] | null, fallbackId?: string | null) => void;
  registerElement: (id: string, ref: HTMLElement) => void;
  unregisterElement: (id: string) => void;
}

export const FocusContext = createContext<FocusContextType | undefined>(undefined);
