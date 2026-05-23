import { create } from "zustand";

type LiveTvStore = {
  selectedCategoryId: string | null;
  lastFocusedChannelByCategory: Record<string, string>;
  gridScrollTopByCategory: Record<string, number>;
  returnFocusId: string | null;
  setSelectedCategoryId: (categoryId: string | null) => void;
  setLastFocusedChannelForCategory: (categoryId: string, channelId: string) => void;
  setGridScrollTopForCategory: (categoryId: string, scrollTop: number) => void;
  setReturnFocusId: (focusId: string | null) => void;
  clear: () => void;
};

export const useLiveTvStore = create<LiveTvStore>((set) => ({
  selectedCategoryId: null,
  lastFocusedChannelByCategory: {},
  gridScrollTopByCategory: {},
  returnFocusId: null,
  setSelectedCategoryId: (categoryId) => set({ selectedCategoryId: categoryId }),
  setLastFocusedChannelForCategory: (categoryId, channelId) =>
    set((state) => ({
      lastFocusedChannelByCategory: {
        ...state.lastFocusedChannelByCategory,
        [categoryId]: channelId,
      },
    })),
  setGridScrollTopForCategory: (categoryId, scrollTop) =>
    set((state) => ({
      gridScrollTopByCategory: {
        ...state.gridScrollTopByCategory,
        [categoryId]: scrollTop,
      },
    })),
  setReturnFocusId: (focusId) => set({ returnFocusId: focusId }),
  clear: () =>
    set({
      selectedCategoryId: null,
      lastFocusedChannelByCategory: {},
      gridScrollTopByCategory: {},
      returnFocusId: null,
    }),
}));
