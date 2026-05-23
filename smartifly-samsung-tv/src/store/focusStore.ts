import { create } from "zustand";

export type FocusState = {
  focusedId: string | null;
  setFocusedId: (focusedId: string | null) => void;
};

export const useFocusStore = create<FocusState>((set) => ({
  focusedId: null,
  setFocusedId: (focusedId) => set({ focusedId }),
}));
