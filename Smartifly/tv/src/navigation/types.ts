/**
 * Smartifly Navigation Types
 * 
 * TypeScript types for type-safe navigation throughout the app.
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

export type RootStackParamList = {
    Login: undefined;
    Loading: undefined;
    // TVShell is the main TV shell (shared sidebar + embedded sections).
    TVShell: undefined;
    TVAccountSwitcher: undefined;
    TVMovieDetail: { movie: MovieItem };
    TVSeriesDetail: { series: SeriesItem };
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
    Blocked: { message?: string; status?: string } | undefined;
};

// TV Screen Props - for standalone screens
export type TVHomeScreenProps = NativeStackScreenProps<RootStackParamList, 'TVShell'>;
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

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
