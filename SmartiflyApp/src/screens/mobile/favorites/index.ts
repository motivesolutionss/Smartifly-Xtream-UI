/**
 * Smartifly Favorites Module
 * 
 * Complete favorites system:
 * - Zustand store with persistence
 * - Favorite button components
 * - Favorites screen with tabs
 * - Empty states
 */

// Main Screen
export { default as FavoritesScreen } from './FavoritesScreen';

// Store
export {
    useFavoritesStore,
    createFavoritesSlice,
    useIsFavorite,
    useFavoriteToggle,
    useFavoritesByType,
    useFavoritesCount,
    FAVORITES_STORAGE_KEY,
} from './store/favoritesStore';
export type { FavoriteType, FavoriteItem, FavoritesState } from './store/favoritesStore';

// Components
export {
    FavoriteButton,
    FavoriteIcon,
    FavoriteTextButton,
    AddToListButton,
    FavoriteCard,
    FavoriteCardSkeleton,
    FavoritesTabs,
    FavoritesSegmented,
    EmptyFavorites,
    EmptyFavoritesCompact,
} from './components';

export type {
    FavoriteButtonSize,
    FavoriteButtonProps,
    FavoriteIconProps,
    FavoriteTextButtonProps,
    AddToListButtonProps,
    FavoriteCardProps,
    FavoriteCardSkeletonProps,
    FavoritesTabType,
    FavoritesTabItem,
    FavoritesTabsProps,
    FavoritesSegmentedProps,
    EmptyFavoritesProps,
    EmptyFavoritesCompactProps,
} from './components';