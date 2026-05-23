import { localStorageService } from "./localStorageService";

const SEARCH_HISTORY_KEY = "smartifly_search_history";
const MAX_SEARCH_HISTORY = 5;

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

    localStorageService.set(SEARCH_HISTORY_KEY, history);
  },

  clearSearchHistory: (): void => {
    localStorageService.set(SEARCH_HISTORY_KEY, []);
  },
};
