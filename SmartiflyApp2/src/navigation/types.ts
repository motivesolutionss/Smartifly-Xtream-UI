/**
 * Smartifly Navigation Types
 * 
 * TypeScript types for type-safe navigation throughout the app.
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// =============================================================================
// CONTENT TYPES (for passing data between screens)
// =============================================================================

export interface LiveStreamItem {
    stream_id: number;
    name: string;
    stream_icon?: string;
    epg_channel_id?: string;
    category_id?: string;
    tv_archive?: number;
}

export interface MovieItem {
    stream_id: number;
    name: string;
    stream_icon?: string;
    rating?: string;
    rating_5based?: number;
    category_id?: string;
    container_extension?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    duration?: string;
}

export interface SeriesItem {
    series_id: number;
    name: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    rating_5based?: number;
    backdrop_path?: string[];
    youtube_trailer?: string;
    category_id?: string;
}

export interface EpisodeItem {
    id: number;
    episode_num: number;
    title: string;
    container_extension?: string;
    info?: {
        movie_image?: string;
        duration?: string;
        plot?: string;
    };
}

// =============================================================================
// STACK NAVIGATOR PARAM LISTS
// =============================================================================

/**
 * Home Stack Parameters
 */
export type HomeStackParamList = {
    HomeMain: undefined;
    Search: undefined;
    Player: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
    };
    MovieDetail: {
        movie: MovieItem;
    };
    SeriesDetail: {
        series: SeriesItem;
    };
};

/**
 * Live Stack Parameters
 */
export type LiveStackParamList = {
    LiveMain: undefined;
    Player: {
        type: 'live';
        item: LiveStreamItem;
    };
};

/**
 * Movies Stack Parameters
 */
export type MoviesStackParamList = {
    MoviesMain: undefined;
    MovieDetail: {
        movie: MovieItem;
    };
    Player: {
        type: 'movie';
        item: MovieItem;
    };
};

/**
 * Series Stack Parameters
 */
export type SeriesStackParamList = {
    SeriesMain: undefined;
    SeriesDetail: {
        series: SeriesItem;
    };
    Player: {
        type: 'series';
        item: SeriesItem | EpisodeItem;
        episodeUrl?: string;
    };
};

/**
 * Settings Stack Parameters
 */
export type SettingsStackParamList = {
    SettingsMain: undefined;
    Profile: undefined;
    Playback: undefined;
    About: undefined;
};

/**
 * Announcements Stack Parameters
 */
export type AnnouncementsStackParamList = {
    AnnouncementsMain: undefined;
};

/**
 * Favorites Stack Parameters
 */
export type FavoritesStackParamList = {
    FavoritesMain: undefined;
    Player: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
    };
    MovieDetail: {
        movie: MovieItem;
    };
    SeriesDetail: {
        series: SeriesItem;
    };
};

/**
 * Search Stack Parameters
 */
export type SearchStackParamList = {
    SearchMain: undefined;
    Player: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
    };
    MovieDetail: {
        movie: MovieItem;
    };
    SeriesDetail: {
        series: SeriesItem;
    };
};

// =============================================================================
// BOTTOM TAB NAVIGATOR PARAM LIST
// =============================================================================

/**
 * Main Bottom Tab Parameters
 */
export type BottomTabParamList = {
    HomeTab: NavigatorScreenParams<HomeStackParamList>;
    FavoritesTab: NavigatorScreenParams<FavoritesStackParamList>;
    AnnouncementsTab: NavigatorScreenParams<AnnouncementsStackParamList>;
    SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// =============================================================================
// ROOT NAVIGATOR PARAM LIST
// =============================================================================

/**
 * Root Stack Parameters (Auth flow + Main app)
 */
export type RootStackParamList = {
    Login: undefined;
    Loading: undefined;
    // TV Screens
    TVHome: undefined;
    TVLive: undefined;
    TVMovies: undefined;
    TVSeries: undefined;
    TVMovieDetail: { movie: any };
    TVSeriesDetail: { series: any }; // Added for TV Module
    // Mobile
    MainTabs: NavigatorScreenParams<BottomTabParamList>;
    // Fullscreen player (can be accessed from anywhere)
    FullscreenPlayer: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
    };
};

// =============================================================================
// SCREEN PROPS TYPES
// =============================================================================

// Root Stack
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type FullscreenPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'FullscreenPlayer'>;

// Home Stack
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;
export type SearchScreenProps = NativeStackScreenProps<HomeStackParamList, 'Search'>;
export type HomePlayerScreenProps = NativeStackScreenProps<HomeStackParamList, 'Player'>;

// Live Stack
export type LiveScreenProps = NativeStackScreenProps<LiveStackParamList, 'LiveMain'>;
export type LivePlayerScreenProps = NativeStackScreenProps<LiveStackParamList, 'Player'>;

// Movies Stack
export type MoviesScreenProps = NativeStackScreenProps<MoviesStackParamList, 'MoviesMain'>;
export type MovieDetailScreenProps = NativeStackScreenProps<MoviesStackParamList, 'MovieDetail'>;
export type MoviesPlayerScreenProps = NativeStackScreenProps<MoviesStackParamList, 'Player'>;

// Series Stack
export type SeriesScreenProps = NativeStackScreenProps<SeriesStackParamList, 'SeriesMain'>;
export type SeriesDetailScreenProps = NativeStackScreenProps<SeriesStackParamList, 'SeriesDetail'>;
export type SeriesPlayerScreenProps = NativeStackScreenProps<SeriesStackParamList, 'Player'>;

// Settings Stack
export type SettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;
export type ProfileScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Profile'>;

// Bottom Tabs
export type HomeTabProps = BottomTabScreenProps<BottomTabParamList, 'HomeTab'>;
export type FavoritesTabProps = BottomTabScreenProps<BottomTabParamList, 'FavoritesTab'>;
export type AnnouncementsTabProps = BottomTabScreenProps<BottomTabParamList, 'AnnouncementsTab'>;
export type SettingsTabProps = BottomTabScreenProps<BottomTabParamList, 'SettingsTab'>;

// =============================================================================
// NAVIGATION HELPER TYPES
// =============================================================================

/**
 * Tab configuration type
 */
export interface TabConfig {
    name: keyof BottomTabParamList;
    label: string;
    icon: string;
    iconFocused: string;
    color: string;
}

/**
 * Tab bar visibility context
 */
export interface TabBarVisibilityState {
    visible: boolean;
    setVisible: (visible: boolean) => void;
}

// =============================================================================
// DECLARATION MERGING FOR REACT NAVIGATION
// =============================================================================

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}