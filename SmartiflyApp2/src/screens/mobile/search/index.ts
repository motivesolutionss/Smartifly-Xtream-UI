/**
 * Smartifly Search Screen Module
 * 
 * Global search experience:
 * - Auto-focus search input with debounce
 * - Tab filtering (All, Live, Movies, Series)
 * - Recent searches with storage
 * - Trending searches
 * - Categorized results
 * - Empty and error states
 */

// Main Screen
export { default as SearchScreen } from './SearchScreen';

// Components
export {
    SearchInput,
    SearchTabs,
    SearchPills,
    RecentSearches,
    TrendingSearches,
    SearchResults,
    SearchResultsSkeleton,
    EmptySearchState,
} from './components';

// Types
export type {
    SearchInputProps,
    SearchInputRef,
    SearchTabType,
    SearchTabItem,
    SearchTabsProps,
    SearchPillsProps,
    RecentSearch,
    RecentSearchesProps,
    TrendingSearchesProps,
    SearchResultItem,
    SearchResultsData,
    SearchResultsProps,
    EmptyStateType,
    EmptySearchStateProps,
} from './components';

// Constants
export { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from './components';