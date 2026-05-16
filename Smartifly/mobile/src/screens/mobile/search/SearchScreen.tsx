import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, borderRadius, Icon } from '../../../theme';
import NavBar from '../../../components/NavBar';
import ContentRow, { RowType } from '../home/components/ContentRow';
import ContentCard, { ContentItem } from '../home/components/ContentCard';
import useContentStore from '../../../store/contentStore';
import { useContentFilter } from '../../../store/profileStore';
import { scheduleIdleWork } from '../../../utils/idle';
import {
    ENABLE_MOVIE_DETAIL_ROUTE_IMAGE_ENRICHMENT_V1,
    ENABLE_SEARCH_FUZZY_MATCH_V1,
    ENABLE_SEARCH_IMAGE_TIEBREAK_V1,
    ENABLE_SEARCH_RELEVANCE_RANKING_V1,
    ENABLE_SEARCH_SUGGESTED_QUALITY_V1,
    ENABLE_SEARCH_TOKENIZED_MATCH_V1,
    ENABLE_SEARCH_TYPED_GRID_V1,
} from '../../../playerFlags';
import { getPersistedDetailBackdropOverride } from '../../../services/persistedImageState';
import { getHomeImageVerificationStatus } from '../../../services/homeImageVerification';
import type { SearchScreenProps } from '../../../navigation/types';
import type { XtreamLiveStream, XtreamMovie, XtreamSeries } from '../../../api/xtream';

// =============================================================================
// TYPES
// =============================================================================

interface SearchResults {
    live: XtreamLiveStream[];
    movies: XtreamMovie[];
    series: XtreamSeries[];
}

interface SuggestedContent {
    movies: XtreamMovie[];
    series: XtreamSeries[];
    live: XtreamLiveStream[];
}

type SearchListItem =
    | { key: string; kind: 'heading'; title: string }
    | { key: string; kind: 'status'; title: string; message?: string; loading?: boolean }
    | { key: string; kind: 'typedSection'; title: string; rowType: RowType; items: ContentItem[]; accentColor?: string }
    | {
        key: string;
        kind: 'row';
        title: string;
        rowType: RowType;
        items: ContentItem[];
        accentColor?: string;
    };

const resolveMovieImage = (movie: any): string => String(
    getPersistedDetailBackdropOverride('movie', movie?.stream_id || '') ||
    movie?.stream_icon ||
    movie?.movie_image ||
    movie?.cover_big ||
    movie?.cover ||
    movie?.backdrop_path?.[0] ||
    ''
);

const resolveSeriesImage = (series: any): string => String(
    series?.cover ||
    series?.cover_big ||
    series?.backdrop_path?.[0] ||
    ''
);

const isHttpsImage = (value?: string | null): boolean => String(value || '').trim().startsWith('https://');

const shouldKeepSuggestedImage = (image?: string | null): boolean => {
    const normalized = String(image || '').trim();
    if (!normalized) return false;
    if (!isHttpsImage(normalized)) return false;

    const status = getHomeImageVerificationStatus(normalized);
    return status === 'verified_ok' || status === 'unknown';
};

const rankSuggestedByImageQuality = <T,>(
    items: T[],
    resolveImage: (item: T) => string
): T[] => {
    const scored = items
        .map((item) => {
            const image = resolveImage(item);
            const status = getHomeImageVerificationStatus(image);
            const https = isHttpsImage(image);
            let score = -1;

            if (https && status === 'verified_ok') score = 3;
            else if (https && status === 'unknown') score = 2;
            else if (status === 'verified_ok') score = 1;

            return { item, score };
        })
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => b.score - a.score);

    return scored.map((entry) => entry.item);
};

const normalizeSearchText = (value?: string): string => (
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
);

const tokenizeSearchText = (value?: string): string[] => (
    normalizeSearchText(value)
        .split(/[\s:|/.,()[\]{}_-]+/)
        .map((token) => token.trim())
        .filter(Boolean)
);

const matchesAllQueryTokens = (name: string | undefined, query: string): boolean => {
    const normalizedName = normalizeSearchText(name);
    const queryTokens = tokenizeSearchText(query);
    if (!normalizedName || queryTokens.length === 0) return false;

    const nameTokens = tokenizeSearchText(normalizedName);
    return queryTokens.every((queryToken) => (
        nameTokens.some((nameToken) => nameToken.includes(queryToken)) ||
        normalizedName.includes(queryToken)
    ));
};

const getSearchRelevanceScore = (name: string | undefined, query: string): number => {
    const normalizedName = normalizeSearchText(name);
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedName || !normalizedQuery) return 999;

    if (normalizedName === normalizedQuery) return 0;
    if (normalizedName.startsWith(normalizedQuery)) return 1;

    const tokens = normalizedName.split(/[\s:|/.,()[\]{}_-]+/).filter(Boolean);
    if (tokens.some((token) => token === normalizedQuery)) return 2;
    if (tokens.some((token) => token.startsWith(normalizedQuery))) return 3;
    if (normalizedName.includes(` ${normalizedQuery}`)) return 4;
    if (normalizedName.includes(normalizedQuery)) return 5;

    return 999;
};

const getSearchImageQualityScore = <T,>(item: T, resolveImage: (item: T) => string): number => {
    const image = resolveImage(item);
    const status = getHomeImageVerificationStatus(image);
    const https = isHttpsImage(image);

    if (https && status === 'verified_ok') return 4;
    if (https && status === 'unknown') return 3;
    if (status === 'verified_ok') return 2;
    if (https) return 1;
    return 0;
};

const rankSearchResultsByRelevance = <T extends { name?: string }>(
    items: T[],
    query: string,
    resolveImage?: (item: T) => string
): T[] => {
    if (!ENABLE_SEARCH_RELEVANCE_RANKING_V1 || items.length <= 1) return items;

    return items
        .map((item, index) => ({
            item,
            index,
            score: getSearchRelevanceScore(item.name, query),
            imageScore: ENABLE_SEARCH_IMAGE_TIEBREAK_V1 && resolveImage
                ? getSearchImageQualityScore(item, resolveImage)
                : 0,
        }))
        .sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            if (a.imageScore !== b.imageScore) return b.imageScore - a.imageScore;
            return a.index - b.index;
        })
        .map(({ item }) => item);
};

const searchTokenizedLimited = <T extends { name?: string }>(
    query: string,
    index: Array<{ nameLower: string; item: T }> | undefined,
    items: T[],
    loaded: boolean,
    maxMatches: number
): T[] => {
    if (!loaded || maxMatches <= 0) return [];

    const source = index && index.length > 0
        ? index.map((entry) => ({ name: entry.nameLower, item: entry.item }))
        : items.map((item) => ({ name: String(item?.name || '').toLowerCase(), item }));

    const matches: T[] = [];
    for (const entry of source) {
        if (!matchesAllQueryTokens(entry.name, query)) continue;
        matches.push(entry.item);
        if (matches.length >= maxMatches) break;
    }

    return matches;
};

const getAllowedFuzzyDistance = (token: string): number => {
    if (token.length <= 4) return 1;
    if (token.length <= 8) return 2;
    return 3;
};

const getBoundedEditDistance = (left: string, right: string, maxDistance: number): number => {
    if (left === right) return 0;
    if (!left || !right) return Math.max(left.length, right.length);
    if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;

    const previous = new Array(right.length + 1);
    const current = new Array(right.length + 1);

    for (let column = 0; column <= right.length; column += 1) {
        previous[column] = column;
    }

    for (let row = 1; row <= left.length; row += 1) {
        current[0] = row;
        let rowMin = current[0];

        for (let column = 1; column <= right.length; column += 1) {
            const cost = left[row - 1] === right[column - 1] ? 0 : 1;
            current[column] = Math.min(
                previous[column] + 1,
                current[column - 1] + 1,
                previous[column - 1] + cost
            );
            rowMin = Math.min(rowMin, current[column]);
        }

        if (rowMin > maxDistance) return maxDistance + 1;

        for (let column = 0; column <= right.length; column += 1) {
            previous[column] = current[column];
        }
    }

    return previous[right.length];
};

const matchesFuzzyQueryTokens = (name: string | undefined, query: string): boolean => {
    const normalizedName = normalizeSearchText(name);
    const queryTokens = tokenizeSearchText(query);
    if (!normalizedName || queryTokens.length === 0) return false;

    const nameTokens = tokenizeSearchText(normalizedName);
    if (nameTokens.length === 0) return false;

    return queryTokens.every((queryToken) => {
        const allowedDistance = getAllowedFuzzyDistance(queryToken);
        return nameTokens.some((nameToken) => {
            if (nameToken === queryToken) return true;
            if (nameToken.includes(queryToken) || queryToken.includes(nameToken)) return true;
            return getBoundedEditDistance(nameToken, queryToken, allowedDistance) <= allowedDistance;
        });
    });
};

const searchFuzzyLimited = <T extends { name?: string }>(
    query: string,
    index: Array<{ nameLower: string; item: T }> | undefined,
    items: T[],
    loaded: boolean,
    maxMatches: number
): T[] => {
    if (!loaded || maxMatches <= 0) return [];

    const source = index && index.length > 0
        ? index.map((entry) => ({ name: entry.nameLower, item: entry.item }))
        : items.map((item) => ({ name: String(item?.name || '').toLowerCase(), item }));

    const matches: T[] = [];
    for (const entry of source) {
        if (!matchesFuzzyQueryTokens(entry.name, query)) continue;
        matches.push(entry.item);
        if (matches.length >= maxMatches) break;
    }

    return matches;
};

const hasDisplayName = (item: any): boolean => String(item?.name || '').trim().length > 0;

const sanitizeNamedItems = <T extends { name?: string }>(items: T[]): T[] => (
    Array.isArray(items) ? items.filter((item) => item && hasDisplayName(item)) : []
);

const selectSpreadItems = <T,>(items: T[], count: number): T[] => {
    if (!items || items.length === 0 || count <= 0) return [];
    if (items.length <= count) return items.slice(0, count);

    const result: T[] = [];
    const max = Math.min(items.length, count);
    const stride = items.length / max;

    for (let index = 0; index < max; index += 1) {
        const itemIndex = Math.min(items.length - 1, Math.floor(index * stride));
        result.push(items[itemIndex]);
    }

    return result;
};

// =============================================================================
// CONFIG
// =============================================================================

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_CHARS = 2;
const RESULT_LIMIT = 12;
const SUGGESTION_LIMIT = 10;
const MOVIE_POOL_LIMIT = 200;
const SERIES_POOL_LIMIT = 200;
const LIVE_POOL_LIMIT = 120;
const SEARCH_WINDOW_SHORT_QUERY = 180;
const SEARCH_WINDOW_LONG_QUERY = 320;
const MAIN_TAB_BOTTOM_SPACER = 112;
const TYPED_GRID_COLUMNS = 3;

const getTypeAccent = (type: ContentItem['type']): string => {
    switch (type) {
        case 'movie': return colors.movies;
        case 'series': return colors.series;
        case 'live': return colors.live;
        default: return colors.primary;
    }
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ live: [], movies: [], series: [] });
    const [suggestedContent, setSuggestedContent] = useState<SuggestedContent>({
        movies: [],
        series: [],
        live: [],
    });
    const [isSearching, setIsSearching] = useState(false);
    const [isPrepared, setIsPrepared] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const searchContentLimited = useContentStore((state) => state.searchContentLimited);
    const moviesLoaded = useContentStore((state) => state.content.movies.loaded);
    const moviesCount = useContentStore((state) => state.content.movies.items.length);
    const seriesLoaded = useContentStore((state) => state.content.series.loaded);
    const seriesCount = useContentStore((state) => state.content.series.items.length);
    const liveLoaded = useContentStore((state) => state.content.live.loaded);
    const liveCount = useContentStore((state) => state.content.live.items.length);
    const { filterContent } = useContentFilter();

    const performSearch = useCallback((searchText: string) => {
        const trimmed = searchText.trim();
        if (!trimmed) {
            setResults({ live: [], movies: [], series: [] });
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        try {
            const domainWindow = trimmed.length >= 5
                ? SEARCH_WINDOW_LONG_QUERY
                : SEARCH_WINDOW_SHORT_QUERY;
            const shouldUseFuzzyFallback = ENABLE_SEARCH_FUZZY_MATCH_V1 && trimmed.length >= 3;
            const shouldUseTokenizedMatch = ENABLE_SEARCH_TOKENIZED_MATCH_V1 && tokenizeSearchText(trimmed).length > 1;
            const baseResult = shouldUseTokenizedMatch
                ? (() => {
                    const {
                        content,
                        searchIndex,
                    } = useContentStore.getState();

                    return {
                        live: searchTokenizedLimited(trimmed, searchIndex.live, content.live.items, content.live.loaded, domainWindow),
                        movies: searchTokenizedLimited(trimmed, searchIndex.movies, content.movies.items, content.movies.loaded, domainWindow),
                        series: searchTokenizedLimited(trimmed, searchIndex.series, content.series.items, content.series.loaded, domainWindow),
                    };
                })()
                : searchContentLimited(trimmed, {
                    live: domainWindow,
                    movies: domainWindow,
                    series: domainWindow,
                });
            const result = shouldUseFuzzyFallback
                ? (() => {
                    const {
                        content,
                        searchIndex,
                    } = useContentStore.getState();

                    const mergeWithFuzzy = <T extends { name?: string }>(
                        primary: T[],
                        fuzzy: T[]
                    ): T[] => {
                        const merged = [...primary];
                        const seen = new Set(primary.map((item) => item));

                        for (const item of fuzzy) {
                            if (seen.has(item)) continue;
                            seen.add(item);
                            merged.push(item);
                            if (merged.length >= domainWindow) break;
                        }

                        return merged;
                    };

                    const fuzzyTopUpLimit = Math.max(6, Math.min(18, Math.floor(domainWindow / 10)));

                    return {
                        live: baseResult.live.length >= fuzzyTopUpLimit
                            ? baseResult.live
                            : mergeWithFuzzy(
                                baseResult.live,
                                searchFuzzyLimited(
                                    trimmed,
                                    searchIndex.live,
                                    content.live.items,
                                    content.live.loaded,
                                    domainWindow
                                )
                            ),
                        movies: baseResult.movies.length >= fuzzyTopUpLimit
                            ? baseResult.movies
                            : mergeWithFuzzy(
                                baseResult.movies,
                                searchFuzzyLimited(
                                    trimmed,
                                    searchIndex.movies,
                                    content.movies.items,
                                    content.movies.loaded,
                                    domainWindow
                                )
                            ),
                        series: baseResult.series.length >= fuzzyTopUpLimit
                            ? baseResult.series
                            : mergeWithFuzzy(
                                baseResult.series,
                                searchFuzzyLimited(
                                    trimmed,
                                    searchIndex.series,
                                    content.series.items,
                                    content.series.loaded,
                                    domainWindow
                                )
                            ),
                    };
                })()
                : baseResult;
            setResults({
                live: rankSearchResultsByRelevance(
                    sanitizeNamedItems(result.live),
                    trimmed,
                    (live) => String((live as any)?.stream_icon || '')
                ),
                movies: rankSearchResultsByRelevance(
                    sanitizeNamedItems(filterContent(result.movies)),
                    trimmed,
                    resolveMovieImage
                ),
                series: rankSearchResultsByRelevance(
                    sanitizeNamedItems(filterContent(result.series)),
                    trimmed,
                    resolveSeriesImage
                ),
            });
        } catch (error) {
            console.warn('[Search] Search failed', error);
            setResults({ live: [], movies: [], series: [] });
            setSearchError(error instanceof Error ? error.message : 'Search failed');
        } finally {
            setIsSearching(false);
        }
    }, [filterContent, searchContentLimited]);

    // Load suggested content (profile-aware)
    useEffect(() => {
        if (!moviesLoaded && !seriesLoaded && !liveLoaded) {
            setSuggestedContent({ movies: [], series: [], live: [] });
            setIsPrepared(false);
            return;
        }

        setIsPrepared(false);
        const task = scheduleIdleWork(() => {
            try {
                const {
                    content: {
                        movies: { items: moviesItems },
                        series: { items: seriesItems },
                        live: { items: liveItems },
                    },
                } = useContentStore.getState();

                const moviePool = sanitizeNamedItems(filterContent(moviesItems.slice(0, MOVIE_POOL_LIMIT)));
                const seriesPool = sanitizeNamedItems(filterContent(seriesItems.slice(0, SERIES_POOL_LIMIT)));
                const livePool = sanitizeNamedItems(liveItems.slice(0, LIVE_POOL_LIMIT));

                const curatedMoviePool = ENABLE_SEARCH_SUGGESTED_QUALITY_V1
                    ? rankSuggestedByImageQuality(moviePool, resolveMovieImage)
                    : moviePool;
                const curatedSeriesPool = ENABLE_SEARCH_SUGGESTED_QUALITY_V1
                    ? rankSuggestedByImageQuality(seriesPool, resolveSeriesImage)
                    : seriesPool;
                const curatedLivePool = ENABLE_SEARCH_SUGGESTED_QUALITY_V1
                    ? rankSuggestedByImageQuality(livePool, (live) => String((live as any)?.stream_icon || ''))
                    : livePool;

                setSuggestedContent({
                    movies: selectSpreadItems(curatedMoviePool, SUGGESTION_LIMIT),
                    series: selectSpreadItems(curatedSeriesPool, SUGGESTION_LIMIT),
                    live: selectSpreadItems(curatedLivePool, SUGGESTION_LIMIT),
                });
                setSearchError(null);
            } catch (error) {
                console.warn('[Search] Suggestion preparation failed', error);
                setSuggestedContent({ movies: [], series: [], live: [] });
                setSearchError('Failed to prepare search suggestions');
            } finally {
                setIsPrepared(true);
            }
        });

        return () => task.cancel();
    }, [filterContent, liveCount, liveLoaded, moviesCount, moviesLoaded, seriesCount, seriesLoaded]);

    // Debounced search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length >= SEARCH_MIN_CHARS) {
                performSearch(query);
            } else {
                setResults({ live: [], movies: [], series: [] });
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [performSearch, query]);

    const handleClear = useCallback(() => {
        setQuery('');
        Keyboard.dismiss();
    }, []);

    const handleContentPress = useCallback((item: ContentItem) => {
        if (item.type === 'live') {
            const live = item.data as XtreamLiveStream | undefined;
            if (!live) return;
            (navigation as any).navigate('FullscreenPlayer', {
                type: 'live',
                item: {
                    stream_id: live.stream_id,
                    name: live.name,
                    stream_icon: live.stream_icon,
                    category_id: live.category_id,
                },
            });
            return;
        }

        if (item.type === 'movie') {
            const movie = item.data as XtreamMovie | undefined;
            if (!movie) return;
            const persistedBackdrop = getPersistedDetailBackdropOverride('movie', movie.stream_id);
            const movieBackdropPath = [
                persistedBackdrop,
                ...(Array.isArray(movie.backdrop_path) ? movie.backdrop_path : []),
            ].filter(Boolean);
            navigation.navigate('MovieDetail', {
                movie: {
                    stream_id: movie.stream_id,
                    name: movie.name,
                    stream_icon: movie.stream_icon,
                    ...(ENABLE_MOVIE_DETAIL_ROUTE_IMAGE_ENRICHMENT_V1 ? {
                        cover: movie.cover,
                        cover_big: movie.cover_big,
                        movie_image: movie.movie_image,
                        backdrop_path: movieBackdropPath.length > 0
                            ? Array.from(new Set(movieBackdropPath))
                            : undefined,
                    } : {}),
                    rating: movie.rating,
                    rating_5based: movie.rating_5based,
                    container_extension: movie.container_extension,
                    plot: movie.plot,
                    genre: movie.genre,
                    youtube_trailer: movie.youtube_trailer,
                },
            });
            return;
        }

        if (item.type === 'series') {
            const series = item.data as XtreamSeries | undefined;
            if (!series) return;
            navigation.navigate('SeriesDetail', { series });
        }
    }, [navigation]);

    const limitedResults = useMemo(() => ({
        movies: results.movies.slice(0, RESULT_LIMIT),
        series: results.series.slice(0, RESULT_LIMIT),
        live: results.live.slice(0, RESULT_LIMIT),
    }), [results]);

    const moviesResultItems = useMemo<ContentItem[]>(() => (
        limitedResults.movies.map((movie) => ({
            id: String(movie.stream_id),
            name: movie.name,
            image: resolveMovieImage(movie),
            type: 'movie',
            rating: movie.rating_5based,
            data: movie,
        }))
    ), [limitedResults.movies]);

    const seriesResultItems = useMemo<ContentItem[]>(() => (
        limitedResults.series.map((series) => ({
            id: String(series.series_id),
            name: series.name,
            image: resolveSeriesImage(series),
            type: 'series',
            rating: series.rating_5based,
            data: series,
        }))
    ), [limitedResults.series]);

    const liveResultItems = useMemo<ContentItem[]>(() => (
        limitedResults.live.map((live) => ({
            id: String(live.stream_id),
            name: live.name,
            image: live.stream_icon,
            type: 'live',
            data: live,
        }))
    ), [limitedResults.live]);

    const suggestedMovies = useMemo<ContentItem[]>(() => (
        suggestedContent.movies
            .map((movie) => ({
                id: String(movie.stream_id),
                name: movie.name,
                image: resolveMovieImage(movie),
                type: 'movie' as const,
                rating: movie.rating_5based,
                data: movie,
            }))
            .filter((item) => !ENABLE_SEARCH_SUGGESTED_QUALITY_V1 || shouldKeepSuggestedImage(item.image))
    ), [suggestedContent.movies]);

    const suggestedSeries = useMemo<ContentItem[]>(() => (
        suggestedContent.series
            .map((series) => ({
                id: String(series.series_id),
                name: series.name,
                image: resolveSeriesImage(series),
                type: 'series' as const,
                rating: series.rating_5based,
                data: series,
            }))
            .filter((item) => !ENABLE_SEARCH_SUGGESTED_QUALITY_V1 || shouldKeepSuggestedImage(item.image))
    ), [suggestedContent.series]);

    const suggestedLive = useMemo<ContentItem[]>(() => (
        suggestedContent.live
            .map((live) => ({
                id: String(live.stream_id),
                name: live.name,
                image: live.stream_icon,
                type: 'live' as const,
                data: live,
            }))
            .filter((item) => !ENABLE_SEARCH_SUGGESTED_QUALITY_V1 || shouldKeepSuggestedImage(item.image))
    ), [suggestedContent.live]);

    const hasResults = useMemo(() => (
        moviesResultItems.length > 0 || seriesResultItems.length > 0 || liveResultItems.length > 0
    ), [liveResultItems.length, moviesResultItems.length, seriesResultItems.length]);

    const trimmedQuery = useMemo(() => query.trim(), [query]);
    const totalResults = useMemo(() => (
        moviesResultItems.length + seriesResultItems.length + liveResultItems.length
    ), [liveResultItems.length, moviesResultItems.length, seriesResultItems.length]);
    const typedCardWidth = useMemo(() => {
        const horizontalPadding = spacing.base * 2;
        const gapTotal = spacing.sm * (TYPED_GRID_COLUMNS - 1);
        return Math.floor((width - horizontalPadding - gapTotal) / TYPED_GRID_COLUMNS);
    }, [width]);

    const renderSection = useCallback((title: string, type: RowType, items: ContentItem[], accentColor?: string) => {
        if (!items.length) return null;
        return {
            key: `${type}-${title}`,
            kind: 'row' as const,
            title,
            rowType: type,
            items,
            accentColor,
        };
    }, []);

    const listData = useMemo<SearchListItem[]>(() => {
        const items: SearchListItem[] = [];

        if (isSearching) {
            items.push({
                key: 'status-searching',
                kind: 'status',
                title: 'Searching...',
                loading: true,
            });
            return items;
        }

        if (trimmedQuery.length < SEARCH_MIN_CHARS) {
            items.push({
                key: 'heading-suggested',
                kind: 'heading',
                title: 'Suggested For You',
            });

            if (!isPrepared) {
                items.push({
                    key: 'status-preparing',
                    kind: 'status',
                    title: 'Preparing suggestions...',
                    loading: true,
                });
                return items;
            }

            if (!suggestedMovies.length && !suggestedSeries.length && !suggestedLive.length) {
                items.push({
                    key: 'status-empty-suggestions',
                    kind: 'status',
                    title: `Type at least ${SEARCH_MIN_CHARS} characters to search`,
                });
                return items;
            }

            const moviesRow = renderSection('Popular Movies', 'movies', suggestedMovies, colors.movies);
            const seriesRow = renderSection('Trending Series', 'series', suggestedSeries, colors.series);
            const liveRow = renderSection('Live Channels', 'live', suggestedLive, colors.live);
            if (moviesRow) items.push(moviesRow);
            if (seriesRow) items.push(seriesRow);
            if (liveRow) items.push(liveRow);
            return items;
        }

        if (searchError) {
            items.push({
                key: 'status-error',
                kind: 'status',
                title: 'Search unavailable right now.',
                message: searchError,
            });
            return items;
        }

        if (!hasResults) {
            items.push({
                key: 'status-no-results',
                kind: 'status',
                title: `No results found for "${trimmedQuery}"`,
            });
            return items;
        }

        if (ENABLE_SEARCH_TYPED_GRID_V1) {
            if (moviesResultItems.length) {
                items.push({
                    key: 'typed-section-movies',
                    kind: 'typedSection',
                    title: 'Movies',
                    rowType: 'movies',
                    items: moviesResultItems,
                    accentColor: colors.movies,
                });
            }
            if (seriesResultItems.length) {
                items.push({
                    key: 'typed-section-series',
                    kind: 'typedSection',
                    title: 'Series',
                    rowType: 'series',
                    items: seriesResultItems,
                    accentColor: colors.series,
                });
            }
            if (liveResultItems.length) {
                items.push({
                    key: 'typed-section-live',
                    kind: 'typedSection',
                    title: 'Live TV',
                    rowType: 'live',
                    items: liveResultItems,
                    accentColor: colors.live,
                });
            }
            return items;
        }

        const moviesRow = renderSection('Movies', 'movies', moviesResultItems, colors.movies);
        const seriesRow = renderSection('Series', 'series', seriesResultItems, colors.series);
        const liveRow = renderSection('Live TV', 'live', liveResultItems, colors.live);
        if (moviesRow) items.push(moviesRow);
        if (seriesRow) items.push(seriesRow);
        if (liveRow) items.push(liveRow);
        return items;
    }, [
        hasResults,
        isPrepared,
        isSearching,
        liveResultItems,
        moviesResultItems,
        renderSection,
        searchError,
        seriesResultItems,
        suggestedLive,
        suggestedMovies,
        suggestedSeries,
        trimmedQuery,
    ]);

    const renderListItem = useCallback(({ item }: { item: SearchListItem }) => {
        if (item.kind === 'heading') {
            return <Text style={styles.sectionHeading}>{item.title}</Text>;
        }

        if (item.kind === 'status') {
            return (
                <View style={styles.centerContent}>
                    {item.loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                    <Text style={styles.helperText}>{item.title}</Text>
                    {item.message ? <Text style={styles.helperSubtext}>{item.message}</Text> : null}
                </View>
            );
        }

        if (item.kind === 'typedSection') {
            return (
                <View style={styles.typedSectionWrap}>
                    <View style={styles.typedSectionHeader}>
                        <View style={[styles.typedSectionAccent, { backgroundColor: item.accentColor || getTypeAccent(item.items[0]?.type || 'movie') }]} />
                        <Text style={styles.typedSectionTitle}>{item.title}</Text>
                    </View>
                    <View style={styles.typedGrid}>
                        {item.items.map((result) => (
                            <View
                                key={`${result.type}:${String(result.id)}`}
                                style={styles.typedGridCard}
                            >
                                <ContentCard
                                    item={result}
                                    onPress={handleContentPress}
                                    variant={result.type === 'live' ? 'channel' : 'poster'}
                                    sizeOverride={{
                                        width: typedCardWidth,
                                        height: result.type === 'live'
                                            ? Math.round(typedCardWidth * 0.86)
                                            : Math.round(typedCardWidth * 1.45),
                                    }}
                                />
                            </View>
                        ))}
                    </View>
                </View>
            );
        }

        return (
            <ContentRow
                title={item.title}
                type={item.rowType}
                items={item.items}
                onItemPress={handleContentPress}
                showSeeAll={false}
                maxItems={RESULT_LIMIT}
                accentColor={item.accentColor}
            />
        );
    }, [handleContentPress, typedCardWidth]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title="Search"
                showBack
                showSearch={false}
            />

            <View style={styles.searchBarWrapper}>
                <Icon name="magnifyingGlass" size={20} color={colors.textMuted} />
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search movies, series, live TV"
                    placeholderTextColor={colors.textMuted}
                    style={styles.searchInput}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    onSubmitEditing={() => performSearch(query)}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                        <Icon name="x" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {trimmedQuery.length >= SEARCH_MIN_CHARS && (
                <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                        <Icon
                            name={isSearching ? 'arrowCounterClockwise' : 'checkCircle'}
                            size={14}
                            color={isSearching ? colors.textMuted : colors.success}
                        />
                        <Text style={styles.metaChipText}>
                            {isSearching ? 'Searching...' : `${totalResults} results`}
                        </Text>
                    </View>
                    {!isSearching && trimmedQuery.length > 0 && (
                        <TouchableOpacity style={styles.metaClearChip} onPress={handleClear} activeOpacity={0.8}>
                            <Text style={styles.metaClearChipText}>Clear query</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <FlashList
                data={listData}
                renderItem={renderListItem}
                keyExtractor={(item) => item.key}
                // @ts-ignore
                estimatedItemSize={220}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER }]}
                getItemType={(item) => item.kind}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.base,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.backgroundInput,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        minHeight: 54,
        gap: spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 2,
    },
    metaRow: {
        marginHorizontal: spacing.base,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    metaChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    metaClearChip: {
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    metaClearChipText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
        paddingVertical: spacing.sm,
    },
    clearButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsContent: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    typedSectionWrap: {
        marginBottom: spacing.lg,
    },
    typedSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.base,
        marginBottom: spacing.sm,
    },
    typedSectionAccent: {
        width: 6,
        height: 18,
        borderRadius: 3,
    },
    typedSectionTitle: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    typedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: spacing.base,
        paddingTop: spacing.xs,
    },
    typedGridCard: {
        marginBottom: spacing.sm,
        width: '31%',
    },
    sectionHeading: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
        marginHorizontal: spacing.base,
        marginBottom: spacing.md,
        marginTop: spacing.sm,
        letterSpacing: 0.1,
    },
    centerContent: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.base,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
    },
    helperText: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: spacing.sm,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
    helperSubtext: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: spacing.xs,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
        opacity: 0.8,
    },
});

export default SearchScreen;
