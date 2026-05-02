/**
 * TV Player Utilities
 *
 * Shared utility functions and types for the TV player screen and its sub-components.
 * Eliminates duplication between TVPlayerScreen.tsx and TVPlayerBottomControls.tsx.
 *
 * @enterprise-grade
 */

// =============================================================================
// TIME FORMATTING
// =============================================================================

/**
 * Formats a duration in seconds to a human-readable time string.
 * @param value - Duration in seconds
 * @returns Formatted time string (e.g., "1:23:45" or "3:45")
 */
export const formatTime = (value: number): string => {
    const totalSeconds = Math.max(0, Math.floor(value || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a media item from the Xtream API.
 * Covers live channels, VOD movies, and series episodes.
 */
export interface MediaItem {
    stream_id?: number | string;
    id?: number | string;
    name?: string;
    title?: string;
    stream_icon?: string;
    cover?: string;
    poster?: string;
    container_extension?: string;
    url?: string;
    duration?: string | number;

    // Series-specific
    series_id?: number | string;
    seriesId?: number | string;
    series_name?: string;
    seriesTitle?: string;
    episodeTitle?: string;
    season?: number | string;
    season_number?: number | string;
    seasonNumber?: number | string;
    episode_num?: number | string;
    episodeNumber?: number | string;

    // Metadata
    info?: {
        movie_image?: string;
        [key: string]: any;
    };
    backdrop_path?: string[];
    previewThumbnails?: string[];
    thumbnails?: string[];
    preview_images?: string[];
    chapters?: any[];
    chapterMarkers?: any[];

    // Catch-all for additional Xtream fields
    [key: string]: any;
}

/**
 * Settings view identifiers for the player settings modal.
 */
export type SettingsView = 'root' | 'quality' | 'audio' | 'subtitles' | 'speed' | 'aspect';

/**
 * Chapter marker for the progress bar.
 */
export interface ChapterMarker {
    time: number;
    title?: string;
}

/**
 * Extracts the domain from a stream URL for display in stats overlay.
 * @param url - The stream URL
 * @returns Domain string or 'Local' for file:// URLs
 */
export const getStreamDomain = (url: string): string => {
    if (!url) return 'Unknown';
    if (url.startsWith('file://')) return 'Local File';
    try {
        const match = url.match(/^https?:\/\/([^/:]+)/);
        return match?.[1] || 'Unknown';
    } catch {
        return 'Unknown';
    }
};
