/**
 * Smartifly Search Screen Components
 */

// Search Input
export { default as SearchInput } from './SearchInput';
export type { SearchInputProps, SearchInputRef } from './SearchInput';

// Search Tabs
export { default as SearchTabs, SearchPills } from './SearchTabs';
export type { SearchTabType, SearchTabItem, SearchTabsProps, SearchPillsProps } from './SearchTabs';

// Recent Searches
export { default as RecentSearches, TrendingSearches } from './RecentSearches';
export type { RecentSearch, RecentSearchesProps, TrendingSearchesProps } from './RecentSearches';
export { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from './RecentSearches';

// Search Results
export { default as SearchResults, SearchResultsSkeleton } from './SearchResults';
export type { SearchResultItem, SearchResultsData, SearchResultsProps } from './SearchResults';

// Empty State
export { default as EmptySearchState } from './EmptySearchState';
export type { EmptyStateType, EmptySearchStateProps } from './EmptySearchState';