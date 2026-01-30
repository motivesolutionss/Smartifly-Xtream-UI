/**
 * Smartifly Favorites Store
 */

export {
    useFavoritesStore,
    createFavoritesSlice,
    useIsFavorite,
    useFavoriteToggle,
    useFavoritesByType,
    useFavoritesCount,
    FAVORITES_STORAGE_KEY,
} from './favoritesStore';

export type {
    FavoriteType,
    FavoriteItem,
    FavoritesState,
} from './favoritesStore';