import { localStorageService } from "./localStorageService";

const SEARCH_HISTORY_KEY = "smartifly_search_history";
const MAX_SEARCH_HISTORY = 5;
const SEARCH_WRITE_DELAY_MS = 150;

export const searchStorage = {
  getRecentSearches: (): string[] => {
    return localStorageService.get<string[]>(SEARCH_HISTORY_KEY) || [];
  },

  saveRecentSearch: (query: string): void => {
    const trimmed = query.trim();
    if (!trimmed) return;

    let history = searchStorage.getRecentSearches();
    // Remove existing to place it on top of recent searches
    history = history.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
    history.unshift(trimmed);

    // Keep it up to MAX_SEARCH_HISTORY items
    history = history.slice(0, MAX_SEARCH_HISTORY);

    localStorageService.setDeferred(SEARCH_HISTORY_KEY, history, SEARCH_WRITE_DELAY_MS);
  },

  clearSearchHistory: (): void => {
    localStorageService.setDeferred(SEARCH_HISTORY_KEY, [], SEARCH_WRITE_DELAY_MS);
  },
};
