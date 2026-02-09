/**
 * Smartifly Navigation Types
 * 
 * TypeScript types for type-safe navigation throughout the app.
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

// =============================================================================
// CONTENT TYPES (for passing data between screens)
// =============================================================================

export interface LiveStreamItem {
    stream_id: number;
    name: string;
    stream_icon?: string;
    category_id?: string;
    tv_archive?: number;
}

export interface MovieItem {
    stream_id: number;
    name: string;
    stream_icon?: string;
    cover?: string;
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
    youtube_trailer?: string;
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
    episode_run_time?: string;
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

export type HomeStackParamList = {
    HomeMain: undefined;
    Search: undefined;
    Browse: { type: 'live' | 'movies' | 'series' };
    Player: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
        resumePosition?: number;
    };
    MovieDetail: {
        movie: MovieItem;
    };
    SeriesDetail: {
        series: SeriesItem;
    };
};

export type LiveStackParamList = {
    LiveMain: undefined;
    Player: {
        type: 'live';
        item: LiveStreamItem;
        resumePosition?: number;
    };
};

export type MoviesStackParamList = {
    MoviesMain: undefined;
    MovieDetail: {
        movie: MovieItem;
    };
    Player: {
        type: 'movie';
        item: MovieItem;
        resumePosition?: number;
    };
};

export type SeriesStackParamList = {
    SeriesMain: undefined;
    SeriesDetail: {
        series: SeriesItem;
    };
    Player: {
        type: 'series';
        item: SeriesItem | EpisodeItem;
        episodeUrl?: string;
        resumePosition?: number;
    };
};

export type SettingsStackParamList = {
    SettingsMain: undefined;
    Profile: undefined;
    Playback: undefined;
    Downloads: undefined;
    About: undefined;
};

export type AnnouncementsStackParamList = {
    AnnouncementsMain: undefined;
};

export type FavoritesStackParamList = {
    FavoritesMain: undefined;
    Player: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
        resumePosition?: number;
    };
    MovieDetail: {
        movie: MovieItem;
    };
    SeriesDetail: {
        series: SeriesItem;
    };
};

export type SearchStackParamList = {
    SearchMain: undefined;
    Player: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
        resumePosition?: number;
    };
    MovieDetail: {
        movie: MovieItem;
    };
    SeriesDetail: {
        series: SeriesItem;
    };
};

export type BottomTabParamList = {
    HomeTab: NavigatorScreenParams<HomeStackParamList>;
    FavoritesTab: NavigatorScreenParams<FavoritesStackParamList>;
    AnnouncementsTab: NavigatorScreenParams<AnnouncementsStackParamList>;
    SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
    Login: undefined;
    Loading: undefined;
    TVHome: undefined;
    TVAccountSwitcher: undefined;
    TVLive: undefined;
    TVMovies: undefined;
    TVSeries: undefined;
    TVMovieDetail: { movie: MovieItem };
    TVSeriesDetail: { series: SeriesItem };
    MainTabs: NavigatorScreenParams<BottomTabParamList>;
    FullscreenPlayer: {
        type: 'live' | 'movie' | 'series';
        item: LiveStreamItem | MovieItem | SeriesItem;
        episodeUrl?: string;
        resumePosition?: number;
    };
    // Profile screens (Parental Controls)
    ProfileSwitcher: undefined;
    ProfileEditor: { profileId?: string };
    PinEntry: { profileId: string; returnTo: keyof RootStackParamList };
    Downloads: undefined;
};

// TV Screen Props - for standalone screens
export type TVHomeScreenProps = NativeStackScreenProps<RootStackParamList, 'TVHome'>;
export type TVLoadingScreenProps = NativeStackScreenProps<RootStackParamList, 'Loading'>;
export type TVMovieDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TVMovieDetail'>;
export type TVSeriesDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TVSeriesDetail'>;

// Props for embedded TV section screens (used within TVHomeScreen)
// These screens receive navigation from TVHomeScreen and need to navigate to other routes
export interface TVEmbeddedScreenProps {
    navigation: TVHomeScreenProps['navigation'];
    focusEntryRef?: (node: View | null) => void;
}

// Types for embedded screens
export type TVLiveScreenProps = TVEmbeddedScreenProps;
export type TVMoviesScreenProps = TVEmbeddedScreenProps;
export type TVSeriesScreenProps = TVEmbeddedScreenProps;
export type TVSettingsScreenProps = TVEmbeddedScreenProps;
export type TVFavoritesScreenProps = TVEmbeddedScreenProps;
export type TVSearchScreenProps = TVEmbeddedScreenProps;
export type TVAnnouncementsScreenProps = TVEmbeddedScreenProps;
export type TVDownloadsScreenProps = TVEmbeddedScreenProps;

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type FullscreenPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'FullscreenPlayer'>;
export type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;
export type SearchScreenProps = NativeStackScreenProps<HomeStackParamList, 'Search'>;
export type BrowseScreenProps = NativeStackScreenProps<HomeStackParamList, 'Browse'>;
export type HomePlayerScreenProps = NativeStackScreenProps<HomeStackParamList, 'Player'>;
export type LiveScreenProps = NativeStackScreenProps<LiveStackParamList, 'LiveMain'>;
export type LivePlayerScreenProps = NativeStackScreenProps<LiveStackParamList, 'Player'>;
export type MoviesScreenProps = NativeStackScreenProps<MoviesStackParamList, 'MoviesMain'>;
export type MovieDetailScreenProps = NativeStackScreenProps<MoviesStackParamList, 'MovieDetail'>;
export type MoviesPlayerScreenProps = NativeStackScreenProps<MoviesStackParamList, 'Player'>;
export type SeriesScreenProps = NativeStackScreenProps<SeriesStackParamList, 'SeriesMain'>;
export type SeriesDetailScreenProps = NativeStackScreenProps<SeriesStackParamList, 'SeriesDetail'>;
export type SeriesPlayerScreenProps = NativeStackScreenProps<SeriesStackParamList, 'Player'>;
export type SettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;
export type ProfileScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Profile'>;
export type HomeTabProps = BottomTabScreenProps<BottomTabParamList, 'HomeTab'>;
export type FavoritesTabProps = BottomTabScreenProps<BottomTabParamList, 'FavoritesTab'>;
export type AnnouncementsTabProps = BottomTabScreenProps<BottomTabParamList, 'AnnouncementsTab'>;
export type SettingsTabProps = BottomTabScreenProps<BottomTabParamList, 'SettingsTab'>;

export interface TabConfig {
    name: keyof BottomTabParamList;
    label: string;
    icon: string;
    iconFocused: string;
    color: string;
}

export interface TabBarVisibilityState {
    visible: boolean;
    setVisible: (visible: boolean) => void;
}

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
