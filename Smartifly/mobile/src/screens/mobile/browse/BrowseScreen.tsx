import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Pressable,
    TouchableOpacity,
    TextInput,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import NavBar from '../../../components/NavBar';
import ContentCard, { ContentItem } from '../home/components/ContentCard';
import useContentStore from '../../../store/contentStore';
import { useContentFilter } from '../../../store/profileStore';
import { colors, spacing, Icon, borderRadius } from '../../../theme';
import { scheduleIdleWork } from '../../../utils/idle';
import { usePerfProfile } from '../../../utils/perf';
import type { BrowseScreenProps } from '../../../navigation/types';
import type { XtreamLiveStream, XtreamMovie, XtreamSeries } from '../../../api/xtream';
import { config } from '../../../config';
import {
    ENABLE_BROWSE_CACHED_FIRST_PAINT_V1,
    ENABLE_BROWSE_EMPTY_STATE_FLASH_FIX_V1,
    ENABLE_BROWSE_FIRST_RESULT_GATE_V1,
    ENABLE_BROWSE_HARD_BODY_GATE_V1,
    ENABLE_BROWSE_GROUPED_ALL_BACKFILL_TUNING_V1,
    ENABLE_BROWSE_GROUPED_ALL_V1,
    ENABLE_BROWSE_GROUPED_ALL_HIDDEN_SECTIONS_V1,
    ENABLE_BROWSE_GROUPED_ALL_VERIFIED_FIRST_V1,
    ENABLE_BROWSE_GROUPED_ALL_VERIFIED_WINDOW_V1,
    ENABLE_BROWSE_MOVIES_ALL_BOUNDED_WINDOW_V1,
    ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1,
    ENABLE_BROWSE_MOVIES_ALL_LAZY_BUILD_V1,
    ENABLE_BROWSE_MOVIES_ALL_POST_PAINT_EXPANSION_V1,
    ENABLE_BROWSE_MOVIES_FIRST_CHUNK_VERIFIED_V1,
    ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1,
    ENABLE_BROWSE_CATEGORY_MODAL_WARMUP_V1,
    ENABLE_BROWSE_CATEGORY_SWITCH_GATE_V1,
    ENABLE_BROWSE_FIRST_CHUNK_GATE_V1,
    ENABLE_BROWSE_GENTLE_ASYNC_REFRESH_V1,
    ENABLE_BROWSE_HTTPS_FIRST_CHUNK_V1,
    ENABLE_BROWSE_HTTPS_VERIFIED_PRIORITY_V1,
    ENABLE_BROWSE_INITIAL_CHUNK_PREFETCH_V1,
    ENABLE_BROWSE_PROGRESSIVE_IMAGE_PREFETCH,
    ENABLE_BROWSE_SCROLL_LOOKAHEAD_PREFETCH_V1,
    ENABLE_BROWSE_STABLE_FIRST_PAINT_V1,
    ENABLE_MOVIE_DETAIL_ROUTE_IMAGE_ENRICHMENT_V1,
} from '../../../playerFlags';
import {
    getHomeImageVerificationStatus,
    shouldAllowHomeImageUri,
    verifyHomeImageUri,
} from '../../../services/homeImageVerification';
import {
    getPersistedDetailBackdropOverride,
    getPersistedBrowseImageOverrides,
    isPersistedBrowseImageWarm,
    markPersistedBrowseImageWarm,
    setPersistedBrowseImageOverride,
} from '../../../services/persistedImageState';
import { isImageWarm, prefetchImages, prefetchImagesReady } from '../../../utils/image';

// =============================================================================
// CONFIG
// =============================================================================

const GRID_COLUMNS_LIVE = 3;
const GRID_COLUMNS_POSTER = 3; // Increased to 3 for better density
const GRID_COLUMN_GAP = spacing.sm;
const MIN_CARD_WIDTH_CHANNEL = 96;
const MIN_CARD_WIDTH_POSTER = 92;
const POSTER_ASPECT_RATIO = 1.5;
const LARGE_CATALOG_THRESHOLD = config.catalog.serverPagination.threshold;
const SERVER_PAGING_ENABLED = config.catalog.serverPagination.enabled;
const SERVER_PAGE_SIZE = config.catalog.serverPagination.pageSize;
const MAIN_TAB_BOTTOM_SPACER = 112;

const resolveMovieImage = (movie: any): string => String(
    movie?.stream_icon ||
    movie?.movie_image ||
    movie?.cover_big ||
    movie?.cover ||
    movie?.backdrop_path?.[0] ||
    ''
);

const isHttpsImage = (value?: string | null): boolean => {
    const normalized = String(value || '').trim();
    return normalized.startsWith('https://');
};

const resolveFirstHttpsImage = (...candidates: Array<string | undefined | null>): string => {
    for (const candidate of candidates) {
        const normalized = String(candidate || '').trim();
        if (isHttpsImage(normalized)) {
            return normalized;
        }
    }
    return '';
};

const resolveSeriesImage = (series: any): string => String(
    series?.cover ||
    series?.cover_big ||
    series?.backdrop_path?.[0] ||
    ''
);

const hasDisplayName = (item: any): boolean => String(item?.name || '').trim().length > 0;

const sanitizeNamedItems = <T extends { name?: string }>(items: T[]): T[] => (
    Array.isArray(items) ? items.filter((item) => item && hasDisplayName(item)) : []
);

type CategoryItem = {
    id: string;
    name: string;
    count?: number;
    color?: string;
};

type GroupedBrowseEntry =
    | {
        type: 'header';
        id: string;
        title: string;
        count: number;
    }
    | {
        type: 'row';
        id: string;
        items: ContentItem[];
    };

const paginationSupportCache: Partial<Record<'live' | 'movies' | 'series', boolean>> = {};
const browsePreparedCatalogCache = new Map<string, {
    categoryItems: CategoryItem[];
    categoryMap: Record<string, ContentItem[]>;
}>();
const browseFirstChunkUriCache = new Map<string, string[]>();

const getBrowseRawItemKey = (
    type: 'live' | 'movies' | 'series',
    item: XtreamLiveStream | XtreamMovie | XtreamSeries
): string => {
    if (type === 'live') return String((item as XtreamLiveStream).stream_id || '');
    if (type === 'movies') return String((item as XtreamMovie).stream_id || '');
    return String((item as XtreamSeries).series_id || '');
};

const buildCategoryMapSignature = (
    categories: CategoryItem[],
    map: Record<string, ContentItem[]>
): string => {
    const categorySignature = categories
        .map((category) => `${category.id}:${category.count ?? ''}`)
        .join('|');
    const allItems = map.all || [];
    const head = allItems.slice(0, 4).map((item) => String(item.id)).join(',');
    const tail = allItems.slice(-2).map((item) => String(item.id)).join(',');
    return `${categorySignature}::${allItems.length}::${head}::${tail}`;
};

const getBrowseImagePriority = (item: ContentItem): number => {
    const image = String(item.image || '').trim();
    if (!image) return 0;
    const status = getHomeImageVerificationStatus(image);
    if (ENABLE_BROWSE_HTTPS_VERIFIED_PRIORITY_V1) {
        if (isHttpsImage(image) && status === 'verified_ok') return 5;
        if (isHttpsImage(image) && status === 'unknown') return 4;
        if (status === 'verified_ok') return 3;
        if (isHttpsImage(image) && shouldAllowHomeImageUri(image)) return 2;
        if (status === 'verified_failed' || status === 'rejected_pattern') return 0;
    }
    if (isHttpsImage(image) && shouldAllowHomeImageUri(image)) return 3;
    if (isHttpsImage(image)) return 2;
    if (image.startsWith('http://') && status !== 'verified_failed' && status !== 'rejected_pattern') return 1;
    return 0;
};

const buildBrowseChunkCacheKey = (
    type: 'live' | 'movies' | 'series',
    categoryId: string,
    firstChunkSize: number
) => `${type}|${categoryId}|${firstChunkSize}`;

const areBrowseChunkUrisWarmEnough = (uris: string[]): boolean => {
    if (uris.length === 0) return true;
    const warmCount = uris.reduce((count, uri) => count + (isImageWarm(uri) ? 1 : 0), 0);
    return warmCount / uris.length >= 0.75;
};

const prioritizeCategoryItems = (items: ContentItem[]): ContentItem[] => {
    if (items.length <= 1) return items;

    return [...items]
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const priorityDelta = getBrowseImagePriority(b.item) - getBrowseImagePriority(a.item);
            if (priorityDelta !== 0) return priorityDelta;
            return a.index - b.index;
        })
        .map(({ item }) => item);
};

const getGroupedAllImagePriority = (item: ContentItem): number => {
    const image = String(item.image || '').trim();
    if (!image) return 0;

    const status = getHomeImageVerificationStatus(image);

    if (status === 'rejected_pattern' || status === 'verified_failed') return 0;
    if (isHttpsImage(image) && status === 'verified_ok') return 6;
    if (isHttpsImage(image) && status === 'unknown') return 5;
    if (status === 'verified_ok') return 4;
    if (isHttpsImage(image) && shouldAllowHomeImageUri(image)) return 3;
    if (isHttpsImage(image)) return 2;
    if (image.startsWith('http://')) return 1;
    return 0;
};

const prioritizeGroupedAllCategoryItems = (items: ContentItem[]): ContentItem[] => {
    if (items.length <= 1) return items;

    return [...items]
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const priorityDelta = getGroupedAllImagePriority(b.item) - getGroupedAllImagePriority(a.item);
            if (priorityDelta !== 0) return priorityDelta;
            return a.index - b.index;
        })
        .map(({ item }) => item);
};

const getGroupedAllWeakBackfillLimit = (
    type: 'live' | 'movies' | 'series',
    gridColumns: number,
    firstWindowSize: number
): number => {
    if (!ENABLE_BROWSE_GROUPED_ALL_BACKFILL_TUNING_V1) return firstWindowSize;

    if (type === 'live') {
        return Math.min(gridColumns, Math.max(0, Math.ceil(firstWindowSize * 0.15)));
    }

    if (type === 'series') {
        return Math.min(gridColumns, Math.max(0, Math.ceil(firstWindowSize * 0.2)));
    }

    return Math.min(gridColumns * 2, Math.max(0, Math.ceil(firstWindowSize * 0.35)));
};

const appendUniqueContentItems = (
    target: ContentItem[],
    items: ContentItem[],
    seen: Set<string>,
    limit: number
) => {
    for (const item of items) {
        if (target.length >= limit) break;
        const key = `${item.type}:${String(item.id)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        target.push(item);
    }
};

const BrowseScreen: React.FC<BrowseScreenProps> = ({ navigation, route }) => {
    const { type } = route.params;
    const insets = useSafeAreaInsets();
    const { width: viewportWidth } = useWindowDimensions();
    const perf = usePerfProfile();
    const { filterContent } = useContentFilter();

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
    const [categoryMap, setCategoryMap] = useState<Record<string, ContentItem[]>>({});
    const [isPrepared, setIsPrepared] = useState(false);
    const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [sortMode, setSortMode] = useState<'default' | 'az' | 'za' | 'new'>('default');
    const [visibleCount, setVisibleCount] = useState(0);
    const [isFirstChunkGatePending, setIsFirstChunkGatePending] = useState(false);
    const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
    const [moviePoolTargetSize, setMoviePoolTargetSize] = useState(0);
    const [hasSettledFirstResult, setHasSettledFirstResult] = useState(false);
    const [browseImageOverrides, setBrowseImageOverrides] = useState<Record<string, string>>(() => getPersistedBrowseImageOverrides());
    const [browseImageVerificationVersion, setBrowseImageVerificationVersion] = useState(0);
    const [remoteItems, setRemoteItems] = useState<ContentItem[]>([]);
    const [remotePage, setRemotePage] = useState(0);
    const [remoteHasMore, setRemoteHasMore] = useState(false);
    const [remoteLoading, setRemoteLoading] = useState(false);
    const [remotePaginationSupported, setRemotePaginationSupported] = useState<boolean | null>(
        paginationSupportCache[type] ?? null
    );
    const remoteLoadingRef = useRef(false);
    const activeDomain = useContentStore((state) => (
        type === 'live'
            ? state.content.live
            : type === 'movies'
                ? state.content.movies
                : state.content.series
    ));
    const contentCacheLoaded = useContentStore((state) => state.contentCacheLoaded);
    const partialForType = useContentStore((state) => (
        type === 'live'
            ? state.contentPartial.live
            : type === 'movies'
                ? state.contentPartial.movies
                : state.contentPartial.series
    ));
    const fullContentLoadingForType = useContentStore((state) => (
        type === 'live'
            ? state.fullContentLoading.live
            : type === 'movies'
                ? state.fullContentLoading.movies
                : state.fullContentLoading.series
    ));
    const ensureFullContent = useContentStore((state) => state.ensureFullContent);
    const getXtreamAPI = useContentStore((state) => state.getXtreamAPI);
    const activeItems = activeDomain.items as Array<XtreamLiveStream | XtreamMovie | XtreamSeries>;
    const activeCategories = activeDomain.categories;
    const needsLocalFullDataset = deferredSearchQuery.trim().length > 0 || sortMode !== 'default';
    const rawItemCount = activeItems.length;
    const isLoaded = activeDomain.loaded;
    const isDomainBootstrapPending = (
        !contentCacheLoaded ||
        (
            rawItemCount === 0 &&
            activeCategories.length === 0 &&
            (!isLoaded || partialForType || fullContentLoadingForType)
        )
    );
    const browsePrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const browsePrefetchKeyRef = useRef<string>('');
    const warmedBrowseCategoriesRef = useRef<Set<string>>(new Set());
    const preparedMapSignatureRef = useRef('');
    const displayContextKeyRef = useRef('');
    const initialBrowseGateDoneRef = useRef(false);
    const categorySwitchGateTokenRef = useRef(0);
    const browseVerificationInFlightRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (partialForType && needsLocalFullDataset) {
            ensureFullContent(type);
        }
    }, [
        ensureFullContent,
        needsLocalFullDataset,
        partialForType,
        type,
    ]);

    useEffect(() => {
        initialBrowseGateDoneRef.current = false;
        setIsFirstChunkGatePending(false);
        setPendingCategoryId(null);
        setHasSettledFirstResult(false);
        setMoviePoolTargetSize(0);
    }, [type]);

    useEffect(() => {
        if (!ENABLE_BROWSE_FIRST_RESULT_GATE_V1) return;
        setHasSettledFirstResult(false);
        setMoviePoolTargetSize(0);
    }, [deferredSearchQuery, selectedCategoryId, sortMode, type]);

    useEffect(() => {
        setRemotePaginationSupported(paginationSupportCache[type] ?? null);
    }, [type]);

    const headerTitle = useMemo(() => {
        if (type === 'live') return 'Live TV';
        if (type === 'movies') return 'Movies';
        return 'Series';
    }, [type]);

    const accentColor = useMemo(() => {
        if (type === 'live') return colors.live;
        if (type === 'movies') return colors.movies;
        return colors.series;
    }, [type]);

    const selectedCategoryLabel = useMemo(() => {
        const match = categoryItems.find((cat) => cat.id === selectedCategoryId);
        if (match) return match.name;
        return type === 'live' ? 'All Channels' : 'All Categories';
    }, [categoryItems, selectedCategoryId, type]);

    const gridColumns = type === 'live' ? GRID_COLUMNS_LIVE : GRID_COLUMNS_POSTER;
    const cardVariant = type === 'live' ? 'channel' : 'poster';
    const showRating = type !== 'live';
    const minCardWidth = type === 'live' ? MIN_CARD_WIDTH_CHANNEL : MIN_CARD_WIDTH_POSTER;

    const gridCardWidth = useMemo(() => {
        const totalGap = GRID_COLUMN_GAP * (gridColumns - 1);
        const available = Math.max(0, viewportWidth - totalGap);
        const calculated = Math.floor(available / gridColumns);
        return Math.max(minCardWidth, calculated);
    }, [gridColumns, minCardWidth, viewportWidth]);

    const gridCardHeight = useMemo(() => (
        type === 'live' ? gridCardWidth : Math.round(gridCardWidth * POSTER_ASPECT_RATIO)
    ), [gridCardWidth, type]);

    const estimatedItemSize = useMemo(() => (
        type === 'live'
            ? gridCardHeight + 42
            : gridCardHeight + 54
    ), [gridCardHeight, type]);

    const gridSideInset = useMemo(() => {
        const usedWidth = (gridCardWidth * gridColumns) + (GRID_COLUMN_GAP * (gridColumns - 1));
        return Math.max(0, Math.floor((viewportWidth - usedWidth) / 2));
    }, [gridCardWidth, gridColumns, viewportWidth]);

    const initialVisibleCount = useMemo(() => {
        const rows = perf.tier === 'low' ? 6 : perf.tier === 'high' ? 12 : 8;
        return rows * gridColumns;
    }, [gridColumns, perf.tier]);

    const visibleStep = useMemo(() => {
        const rows = perf.tier === 'low' ? 4 : perf.tier === 'high' ? 10 : 6;
        return rows * gridColumns;
    }, [gridColumns, perf.tier]);

    const bootstrapLocalCatalogLimit = useMemo(() => (
        Math.max(initialVisibleCount + visibleStep, gridColumns * 10)
    ), [gridColumns, initialVisibleCount, visibleStep]);

    const rawCategories = useMemo(() => activeCategories || [], [activeCategories]);
    const preparedCatalogCacheKey = useMemo(() => {
        const head = activeItems
            .slice(0, 6)
            .map((item) => getBrowseRawItemKey(type, item))
            .join(',');
        const tail = activeItems
            .slice(-3)
            .map((item) => getBrowseRawItemKey(type, item))
            .join(',');

        return [
            type,
            String(rawItemCount),
            String(rawCategories.length),
            head,
            tail,
        ].join('|');
    }, [activeItems, rawCategories.length, rawItemCount, type]);

    const getBrowseItemKey = useCallback((itemType: ContentItem['type'], id: string | number) => (
        `${itemType}:${String(id)}`
    ), []);

    const mapToContentItem = useCallback((item: XtreamLiveStream | XtreamMovie | XtreamSeries): ContentItem => {
        if (type === 'live') {
            const live = item as XtreamLiveStream;
            const override = browseImageOverrides[getBrowseItemKey('live', live.stream_id)];
            const image = ENABLE_BROWSE_HTTPS_FIRST_CHUNK_V1
                ? resolveFirstHttpsImage(override, live.stream_icon) || override || live.stream_icon
                : override || live.stream_icon;
            return {
                id: String(live.stream_id),
                name: live.name,
                image,
                type: 'live',
                data: live,
            };
        }

        if (type === 'movies') {
            const movie = item as XtreamMovie;
            const override = browseImageOverrides[getBrowseItemKey('movie', movie.stream_id)];
            const persistedBackdrop = getPersistedDetailBackdropOverride('movie', movie.stream_id);
            const image = ENABLE_BROWSE_HTTPS_FIRST_CHUNK_V1
                ? resolveFirstHttpsImage(
                    override,
                    persistedBackdrop,
                    movie.stream_icon,
                    movie.movie_image,
                    movie.cover_big,
                    movie.cover,
                    movie.backdrop_path?.[0]
                ) || override || persistedBackdrop || resolveMovieImage(movie)
                : override || persistedBackdrop || resolveMovieImage(movie);
            return {
                id: String(movie.stream_id),
                name: movie.name,
                image,
                type: 'movie',
                rating: movie.rating_5based,
                data: movie,
            };
        }

        const series = item as XtreamSeries;
        const override = browseImageOverrides[getBrowseItemKey('series', series.series_id)];
        const image = ENABLE_BROWSE_HTTPS_FIRST_CHUNK_V1
            ? resolveFirstHttpsImage(
                override,
                series.cover,
                series.cover_big,
                series.backdrop_path?.[0]
            ) || override || resolveSeriesImage(series)
            : override || resolveSeriesImage(series);
        return {
            id: String(series.series_id),
            name: series.name,
            image,
            type: 'series',
            rating: series.rating_5based,
            data: series,
        };
    }, [browseImageOverrides, getBrowseItemKey, type]);

    const preferRemoteCatalog = useMemo(() => (
        SERVER_PAGING_ENABLED &&
        !needsLocalFullDataset &&
        (
            partialForType ||
            rawItemCount >= LARGE_CATALOG_THRESHOLD
        )
    ), [needsLocalFullDataset, partialForType, rawItemCount]);
    const shouldProbeRemoteCatalog = preferRemoteCatalog && remotePaginationSupported !== false;
    const shouldPrepareLocalCatalog = !shouldProbeRemoteCatalog || needsLocalFullDataset;

    const rawItems = useMemo(() => {
        if (!isLoaded || !shouldPrepareLocalCatalog) return [];
        if (type === 'live') return sanitizeNamedItems(activeItems as XtreamLiveStream[]);
        return sanitizeNamedItems(filterContent(activeItems as Array<XtreamMovie | XtreamSeries>));
    }, [
        activeItems,
        filterContent,
        isLoaded,
        shouldPrepareLocalCatalog,
        type,
    ]);

    const bootstrapLocalItems = useMemo(() => {
        if (!ENABLE_BROWSE_CACHED_FIRST_PAINT_V1) return [] as Array<XtreamLiveStream | XtreamMovie | XtreamSeries>;
        if (!isLoaded || !shouldProbeRemoteCatalog || needsLocalFullDataset) return [] as Array<XtreamLiveStream | XtreamMovie | XtreamSeries>;

        const baseItems = type === 'live'
            ? sanitizeNamedItems(activeItems as XtreamLiveStream[])
            : sanitizeNamedItems(filterContent(activeItems as Array<XtreamMovie | XtreamSeries>));

        return baseItems.slice(0, bootstrapLocalCatalogLimit);
    }, [
        activeItems,
        bootstrapLocalCatalogLimit,
        filterContent,
        isLoaded,
        needsLocalFullDataset,
        shouldProbeRemoteCatalog,
        type,
    ]);

    useEffect(() => {
        if (!isLoaded || isDomainBootstrapPending) {
            setCategoryItems([]);
            setCategoryMap({});
            setIsPrepared(false);
            return;
        }

        if (!shouldPrepareLocalCatalog) {
            const bootstrapMappedItems = bootstrapLocalItems.map((raw) => mapToContentItem(raw));
            const nextCategories: CategoryItem[] = [
                {
                    id: 'all',
                    name: type === 'live' ? 'All Channels' : 'All',
                    count: rawItemCount,
                    color: accentColor,
                },
                ...rawCategories.map((category) => ({
                    id: String(category.category_id),
                    name: category.category_name,
                })),
            ];

            if (ENABLE_BROWSE_STABLE_FIRST_PAINT_V1) {
                browsePreparedCatalogCache.set(preparedCatalogCacheKey, {
                    categoryItems: nextCategories,
                    categoryMap: { all: bootstrapMappedItems },
                });
            }
            preparedMapSignatureRef.current = buildCategoryMapSignature(nextCategories, { all: bootstrapMappedItems });
            setCategoryItems(nextCategories);
            setCategoryMap({ all: bootstrapMappedItems });
            setIsPrepared(true);
            setSelectedCategoryId((prev) => (
                (prev === 'all' || nextCategories.some((entry) => entry.id === prev)) && (
                    prev === 'all' || bootstrapMappedItems.length > 0
                )
                    ? prev
                    : 'all'
            ));
            return;
        }

        const cachedPrepared = ENABLE_BROWSE_STABLE_FIRST_PAINT_V1
            ? browsePreparedCatalogCache.get(preparedCatalogCacheKey)
            : null;

        if (cachedPrepared) {
            setCategoryMap(cachedPrepared.categoryMap);
            setCategoryItems(cachedPrepared.categoryItems);
            setIsPrepared(true);
            setSelectedCategoryId((prev) => (cachedPrepared.categoryMap[prev] ? prev : 'all'));
        } else {
            setIsPrepared(false);
        }

        const task = scheduleIdleWork(() => {
            const nextMap: Record<string, ContentItem[]> = { all: [] };
            const countMap: Record<string, number> = {};

            for (const raw of rawItems) {
                const mapped = mapToContentItem(raw);
                nextMap.all.push(mapped);

                const catId = String((raw as XtreamLiveStream).category_id || '');
                if (!catId) continue;
                countMap[catId] = (countMap[catId] || 0) + 1;
                if (!nextMap[catId]) nextMap[catId] = [];
                nextMap[catId].push(mapped);
            }

            const nextCategories: CategoryItem[] = [
                {
                    id: 'all',
                    name: type === 'live' ? 'All Channels' : 'All',
                    count: nextMap.all.length,
                    color: accentColor,
                },
            ];

            for (const category of rawCategories) {
                const catId = String(category.category_id);
                const count = countMap[catId] || 0;
                if (!count) continue;
                nextCategories.push({
                    id: catId,
                    name: category.category_name,
                    count,
                });
            }

            if (ENABLE_BROWSE_STABLE_FIRST_PAINT_V1) {
                browsePreparedCatalogCache.set(preparedCatalogCacheKey, {
                    categoryItems: nextCategories,
                    categoryMap: nextMap,
                });
            }

            const nextSignature = buildCategoryMapSignature(nextCategories, nextMap);
            const shouldSkipPreparedSwap = (
                ENABLE_BROWSE_GENTLE_ASYNC_REFRESH_V1 &&
                preparedMapSignatureRef.current === nextSignature
            );

            preparedMapSignatureRef.current = nextSignature;
            if (!shouldSkipPreparedSwap) {
                setCategoryMap(nextMap);
                setCategoryItems(nextCategories);
            }
            setIsPrepared(true);
            setSelectedCategoryId((prev) => (nextMap[prev] ? prev : 'all'));
        });

        return () => task.cancel();
    }, [
        accentColor,
        isLoaded,
        isDomainBootstrapPending,
        mapToContentItem,
        rawCategories,
        rawItemCount,
        rawItems,
        preparedCatalogCacheKey,
        bootstrapLocalItems,
        shouldPrepareLocalCatalog,
        type,
    ]);

    const displayItems = useMemo(() => {
        if (!isPrepared) return [];
        const source = categoryMap[selectedCategoryId] || [];
        const query = deferredSearchQuery.trim().toLowerCase();

        let next = query.length > 0
            ? source.filter((entry) => entry.name.toLowerCase().includes(query))
            : source;

        if (sortMode === 'az') {
            next = [...next].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortMode === 'za') {
            next = [...next].sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortMode === 'new') {
            next = [...next].sort((a, b) => {
                const getNewestScore = (entry: ContentItem): number => {
                    if (entry.type === 'movie') {
                        return parseInt((entry.data as XtreamMovie)?.added || '0', 10) || 0;
                    }
                    if (entry.type === 'series') {
                        return new Date((entry.data as XtreamSeries)?.last_modified || 0).getTime() || 0;
                    }
                    return 0;
                };
                return getNewestScore(b) - getNewestScore(a);
            });
        }

        return next;
    }, [categoryMap, deferredSearchQuery, isPrepared, selectedCategoryId, sortMode]);

    const prioritizedDisplayItems = useMemo(() => {
        if (!ENABLE_BROWSE_HTTPS_FIRST_CHUNK_V1) return displayItems;
        if (!isPrepared || displayItems.length === 0) return displayItems;
        if (deferredSearchQuery.trim().length > 0 || sortMode !== 'default') return displayItems;

        const firstChunkSize = Math.min(initialVisibleCount, displayItems.length);
        if (firstChunkSize <= 0) return displayItems;

        if (
            type === 'movies' &&
            ENABLE_BROWSE_MOVIES_FIRST_CHUNK_VERIFIED_V1 &&
            selectedCategoryId === 'all'
        ) {
            const verifiedItems = displayItems.filter((item) => getGroupedAllImagePriority(item) >= 6);
            const httpsUnknownItems = displayItems.filter((item) => getGroupedAllImagePriority(item) === 5);
            const weakerItems = displayItems.filter((item) => getGroupedAllImagePriority(item) < 5);
            const weakBackfillLimit = getGroupedAllWeakBackfillLimit(type, gridColumns, firstChunkSize);

            const promoted = [...verifiedItems.slice(0, firstChunkSize)];
            if (promoted.length < firstChunkSize) {
                promoted.push(...httpsUnknownItems.slice(0, firstChunkSize - promoted.length));
            }
            if (promoted.length < firstChunkSize) {
                promoted.push(...weakerItems.slice(0, Math.min(firstChunkSize - promoted.length, weakBackfillLimit)));
            }

            const promotedIds = new Set(promoted.map((item) => String(item.id)));
            const remainder = displayItems.filter((item) => !promotedIds.has(String(item.id)));
            return [...promoted, ...remainder];
        }

        const strongItems: ContentItem[] = [];
        const otherItems: ContentItem[] = [];

        for (const item of displayItems) {
            if (getBrowseImagePriority(item) >= 2) {
                strongItems.push(item);
            } else {
                otherItems.push(item);
            }
        }

        if (strongItems.length === 0) return displayItems;

        const promoted = [...strongItems.slice(0, firstChunkSize)];
        if (promoted.length < firstChunkSize) {
            promoted.push(...otherItems.slice(0, firstChunkSize - promoted.length));
        }

        const promotedIds = new Set(promoted.map((item) => String(item.id)));
        const remainder = displayItems.filter((item) => !promotedIds.has(String(item.id)));
        return [...promoted, ...remainder];
    }, [
        browseImageVerificationVersion,
        deferredSearchQuery,
        displayItems,
        gridColumns,
        initialVisibleCount,
        isPrepared,
        selectedCategoryId,
        sortMode,
        type,
    ]);

    useEffect(() => {
        if (!isPrepared) {
            setVisibleCount(0);
            displayContextKeyRef.current = '';
            return;
        }

        const nextContextKey = [
            type,
            selectedCategoryId,
            deferredSearchQuery.trim().toLowerCase(),
            sortMode,
            useRemoteData ? 'remote' : 'local',
        ].join('|');
        const isSameContext = displayContextKeyRef.current === nextContextKey;
        displayContextKeyRef.current = nextContextKey;

        setVisibleCount((prev) => {
            if (
                ENABLE_BROWSE_GENTLE_ASYNC_REFRESH_V1 &&
                isSameContext &&
                prev > 0
            ) {
                return Math.min(Math.max(prev, initialVisibleCount), displayItems.length);
            }
            return Math.min(initialVisibleCount, displayItems.length);
        });
    }, [
        prioritizedDisplayItems.length,
        deferredSearchQuery,
        initialVisibleCount,
        isPrepared,
        selectedCategoryId,
        sortMode,
        type,
        useRemoteData,
    ]);

    const visibleItems = useMemo(() => (
        prioritizedDisplayItems.slice(0, visibleCount)
    ), [prioritizedDisplayItems, visibleCount]);

    const isRemoteDataActiveForAllDecision = (
        shouldProbeRemoteCatalog &&
        isPrepared &&
        remotePaginationSupported === true &&
        remotePage > 0
    );

    useEffect(() => {
        if (!(type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_LAZY_BUILD_V1)) return;
        const boundedInitialTarget = ENABLE_BROWSE_MOVIES_ALL_BOUNDED_WINDOW_V1
            ? Math.max(visibleCount + visibleStep, initialVisibleCount, gridColumns * 6)
            : Math.max(visibleCount * 3, initialVisibleCount * 2, gridColumns * 12);
        setMoviePoolTargetSize((prev) => Math.max(prev, boundedInitialTarget));
    }, [gridColumns, initialVisibleCount, type, visibleCount, visibleStep]);

    const shouldUseGroupedAll = useMemo(() => (
        (ENABLE_BROWSE_GROUPED_ALL_V1 || (type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1)) &&
        isPrepared &&
        !isRemoteDataActiveForAllDecision &&
        selectedCategoryId === 'all' &&
        deferredSearchQuery.trim().length === 0 &&
        sortMode === 'default'
    ), [
        deferredSearchQuery,
        isPrepared,
        isRemoteDataActiveForAllDecision,
        selectedCategoryId,
        sortMode,
        type,
    ]);

    const groupedAllEntries = useMemo(() => {
        if (!shouldUseGroupedAll) return [] as GroupedBrowseEntry[];

        let remaining = visibleCount;
        const entries: GroupedBrowseEntry[] = [];

        for (const category of categoryItems) {
            if (remaining <= 0) break;
            if (category.id === 'all') continue;

            const source = categoryMap[category.id] || [];
            if (source.length === 0) continue;

            const prioritized = (ENABLE_BROWSE_GROUPED_ALL_VERIFIED_FIRST_V1 || (type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1))
                ? prioritizeGroupedAllCategoryItems(source)
                : prioritizeCategoryItems(source);
            const sectionItems = prioritized.slice(0, remaining);
            if (sectionItems.length === 0) continue;

            entries.push({
                type: 'header',
                id: `header:${category.id}`,
                title: category.name,
                count: source.length,
            });

            for (let index = 0; index < sectionItems.length; index += gridColumns) {
                entries.push({
                    type: 'row',
                    id: `row:${category.id}:${index}`,
                    items: sectionItems.slice(index, index + gridColumns),
                });
            }

            remaining -= sectionItems.length;
        }

        return entries;
    }, [categoryItems, categoryMap, gridColumns, shouldUseGroupedAll, visibleCount]);

    const groupedAllVisibleItems = useMemo(() => {
        if (!shouldUseGroupedAll) return [] as ContentItem[];

        const deduped: ContentItem[] = [];
        const seen = new Set<string>();

        if (type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_LAZY_BUILD_V1) {
            const targetPoolSize = Math.max(
                moviePoolTargetSize,
                ENABLE_BROWSE_MOVIES_ALL_BOUNDED_WINDOW_V1
                    ? Math.max(visibleCount + visibleStep, initialVisibleCount, gridColumns * 6)
                    : Math.max(visibleCount * 3, initialVisibleCount * 2, gridColumns * 12)
            );
            const maxCategoriesToScan = ENABLE_BROWSE_MOVIES_ALL_BOUNDED_WINDOW_V1
                ? Math.max(Math.ceil(targetPoolSize / Math.max(gridColumns, 1)) * 2, 8)
                : categoryItems.length;
            const categoryScanLimit = ENABLE_BROWSE_MOVIES_ALL_BOUNDED_WINDOW_V1
                ? Math.max(gridColumns * 8, initialVisibleCount * 2)
                : Number.MAX_SAFE_INTEGER;
            const candidateCategories = categoryItems
                .filter((category) => category.id !== 'all')
                .slice(0, maxCategoriesToScan);
            const prioritizedByCategory = candidateCategories.map((category) => {
                const source = (categoryMap[category.id] || []).slice(0, categoryScanLimit);
                return (ENABLE_BROWSE_GROUPED_ALL_VERIFIED_FIRST_V1 || (type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1))
                    ? prioritizeGroupedAllCategoryItems(source)
                    : prioritizeCategoryItems(source);
            });

            let perCategoryOffset = 0;
            while (deduped.length < targetPoolSize) {
                let madeProgress = false;
                for (const source of prioritizedByCategory) {
                    if (perCategoryOffset >= source.length) continue;
                    appendUniqueContentItems(deduped, source.slice(perCategoryOffset, perCategoryOffset + gridColumns), seen, targetPoolSize);
                    madeProgress = true;
                    if (deduped.length >= targetPoolSize) break;
                }
                if (!madeProgress) break;
                perCategoryOffset += gridColumns;
            }

            if (deduped.length === 0) {
                appendUniqueContentItems(deduped, prioritizedDisplayItems, seen, targetPoolSize);
            }
        } else {
            const orderedCategoryItems = categoryItems
                .filter((category) => category.id !== 'all')
                .flatMap((category) => {
                    const source = categoryMap[category.id] || [];
                    return (ENABLE_BROWSE_GROUPED_ALL_VERIFIED_FIRST_V1 || (type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1))
                        ? prioritizeGroupedAllCategoryItems(source)
                        : prioritizeCategoryItems(source);
                });

            for (const item of orderedCategoryItems) {
                const key = `${item.type}:${String(item.id)}`;
                if (seen.has(key)) continue;
                seen.add(key);
                deduped.push(item);
            }
        }

        const groupedSourceBase = deduped.length > 0
            ? deduped
            : prioritizedDisplayItems;

        if (!(ENABLE_BROWSE_GROUPED_ALL_VERIFIED_WINDOW_V1 || (type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1))) {
            return groupedSourceBase.slice(0, visibleCount);
        }

        const firstWindowSize = Math.min(visibleCount, groupedSourceBase.length);
        const verifiedItems = groupedSourceBase.filter((item) => getGroupedAllImagePriority(item) >= 6);
        const httpsUnknownItems = groupedSourceBase.filter((item) => getGroupedAllImagePriority(item) === 5);
        const weakerItems = groupedSourceBase.filter((item) => getGroupedAllImagePriority(item) < 5);
        const weakBackfillLimit = getGroupedAllWeakBackfillLimit(type, gridColumns, firstWindowSize);

        const promoted = [...verifiedItems.slice(0, firstWindowSize)];
        if (promoted.length < firstWindowSize) {
            promoted.push(...httpsUnknownItems.slice(0, firstWindowSize - promoted.length));
        }
        if (promoted.length < firstWindowSize) {
            promoted.push(...weakerItems.slice(0, Math.min(firstWindowSize - promoted.length, weakBackfillLimit)));
        }

        const promotedKeys = new Set(promoted.map((item) => `${item.type}:${String(item.id)}`));
        const remainder = groupedSourceBase.filter((item) => !promotedKeys.has(`${item.type}:${String(item.id)}`));
        return [...promoted, ...remainder].slice(0, visibleCount);
    }, [
        categoryItems,
        categoryMap,
        gridColumns,
        initialVisibleCount,
        moviePoolTargetSize,
        prioritizedDisplayItems,
        shouldUseGroupedAll,
        type,
        visibleCount,
        visibleStep,
    ]);

    const shouldUseGroupedAllSource = shouldUseGroupedAll;

    const initialFirstChunkUris = useMemo(() => {
        const cacheKey = buildBrowseChunkCacheKey(type, selectedCategoryId, initialVisibleCount);
        if (ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1) {
            const cached = browseFirstChunkUriCache.get(cacheKey);
            if (cached?.length) return cached;
        }

        const sourceItems = shouldUseGroupedAllSource
            ? groupedAllVisibleItems
            : prioritizedDisplayItems;

        const nextUris = sourceItems
            .slice(0, initialVisibleCount)
            .map((item) => item.image)
            .filter((uri): uri is string => Boolean(uri));

        if (ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1 && nextUris.length > 0) {
            browseFirstChunkUriCache.set(cacheKey, nextUris);
        }
        return nextUris;
    }, [groupedAllVisibleItems, initialVisibleCount, prioritizedDisplayItems, selectedCategoryId, shouldUseGroupedAllSource, type]);

    const getCategoryFirstChunkUris = useCallback((categoryId: string): string[] => {
        const cacheKey = buildBrowseChunkCacheKey(type, categoryId, initialVisibleCount);
        if (ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1) {
            const cached = browseFirstChunkUriCache.get(cacheKey);
            if (cached?.length) return cached;
        }

        const source = categoryMap[categoryId] || [];
        const nextUris = source
            .slice(0, initialVisibleCount)
            .map((item) => item.image)
            .filter((uri): uri is string => Boolean(uri));

        if (ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1 && nextUris.length > 0) {
            browseFirstChunkUriCache.set(cacheKey, nextUris);
        }
        return nextUris;
    }, [categoryMap, initialVisibleCount, type]);

    const gateTimeoutMs = useMemo(() => (
        perf.tier === 'low' ? 320 : perf.tier === 'high' ? 180 : 240
    ), [perf.tier]);

    useEffect(() => {
        if (!ENABLE_BROWSE_HTTPS_VERIFIED_PRIORITY_V1) return;
        if (!isPrepared || useRemoteData) return;
        if (deferredSearchQuery.trim().length > 0 || sortMode !== 'default') return;

        const verifyCandidates = prioritizedDisplayItems
            .slice(0, Math.max(initialVisibleCount * 2, 18))
            .map((item) => String(item.image || '').trim())
            .filter((uri) => uri.startsWith('https://'))
            .filter((uri) => getHomeImageVerificationStatus(uri) === 'unknown')
            .filter((uri, index, arr) => arr.indexOf(uri) === index)
            .filter((uri) => !browseVerificationInFlightRef.current.has(uri))
            .slice(0, 18);

        if (verifyCandidates.length === 0) return;

        let cancelled = false;

        const run = async () => {
            let changed = false;

            for (const uri of verifyCandidates) {
                if (cancelled) break;
                browseVerificationInFlightRef.current.add(uri);
                try {
                    const status = await verifyHomeImageUri(uri);
                    if (status === 'verified_ok' || status === 'verified_failed' || status === 'rejected_pattern') {
                        changed = true;
                    }
                } finally {
                    browseVerificationInFlightRef.current.delete(uri);
                }
            }

            if (!cancelled && changed) {
                setBrowseImageVerificationVersion((value) => value + 1);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [
        browseImageVerificationVersion,
        deferredSearchQuery,
        initialVisibleCount,
        isPrepared,
        prioritizedDisplayItems,
        sortMode,
        useRemoteData,
    ]);

    useEffect(() => {
        if (!ENABLE_BROWSE_FIRST_CHUNK_GATE_V1) return;
        if (initialBrowseGateDoneRef.current) return;
        if (!isPrepared || useRemoteData) return;
        if (deferredSearchQuery.trim().length > 0 || sortMode !== 'default') return;

        if (initialFirstChunkUris.length === 0) {
            initialBrowseGateDoneRef.current = true;
            setIsFirstChunkGatePending(false);
            return;
        }

        if (
            ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1 &&
            areBrowseChunkUrisWarmEnough(initialFirstChunkUris)
        ) {
            initialBrowseGateDoneRef.current = true;
            setIsFirstChunkGatePending(false);
            return;
        }

        let cancelled = false;
        initialBrowseGateDoneRef.current = true;
        setIsFirstChunkGatePending(true);

        Promise.race([
            prefetchImagesReady(initialFirstChunkUris),
            new Promise((resolve) => setTimeout(resolve, gateTimeoutMs)),
        ]).finally(() => {
            if (!cancelled) {
                setIsFirstChunkGatePending(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        deferredSearchQuery,
        gateTimeoutMs,
        initialVisibleCount,
        initialFirstChunkUris,
        isPrepared,
        prioritizedDisplayItems,
        sortMode,
        useRemoteData,
    ]);

    useEffect(() => {
        if (!ENABLE_BROWSE_CATEGORY_SWITCH_GATE_V1) return;
        if (!pendingCategoryId) return;
        if (!isPrepared || useRemoteData) {
            setSelectedCategoryId(pendingCategoryId);
            setPendingCategoryId(null);
            return;
        }
        if (deferredSearchQuery.trim().length > 0 || sortMode !== 'default') {
            setSelectedCategoryId(pendingCategoryId);
            setPendingCategoryId(null);
            return;
        }

        const nextChunkUris = getCategoryFirstChunkUris(pendingCategoryId);

        const token = categorySwitchGateTokenRef.current + 1;
        categorySwitchGateTokenRef.current = token;

        if (nextChunkUris.length === 0) {
            setSelectedCategoryId(pendingCategoryId);
            setPendingCategoryId(null);
            setIsFirstChunkGatePending(false);
            return;
        }

        if (
            ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1 &&
            areBrowseChunkUrisWarmEnough(nextChunkUris)
        ) {
            setSelectedCategoryId(pendingCategoryId);
            setPendingCategoryId(null);
            setIsFirstChunkGatePending(false);
            return;
        }

        setIsFirstChunkGatePending(true);

        let cancelled = false;

        Promise.race([
            prefetchImagesReady(nextChunkUris),
            new Promise((resolve) => setTimeout(resolve, gateTimeoutMs)),
        ]).finally(() => {
            if (cancelled || categorySwitchGateTokenRef.current !== token) return;
            setSelectedCategoryId(pendingCategoryId);
            setPendingCategoryId(null);
            setIsFirstChunkGatePending(false);
        });

        return () => {
            cancelled = true;
        };
    }, [
        deferredSearchQuery,
        gateTimeoutMs,
        getCategoryFirstChunkUris,
        isPrepared,
        pendingCategoryId,
        sortMode,
        useRemoteData,
    ]);

    const browsePrefetchWindowSize = useMemo(() => (
        type === 'live'
            ? perf.tier === 'low' ? gridColumns * 4 : perf.tier === 'high' ? gridColumns * 6 : gridColumns * 5
            : perf.tier === 'low' ? gridColumns * 5 : perf.tier === 'high' ? gridColumns * 8 : gridColumns * 6
    ), [gridColumns, perf.tier, type]);

    const browsePrefetchLookAhead = useMemo(() => (
        type === 'live'
            ? perf.tier === 'low' ? gridColumns * 2 : perf.tier === 'high' ? gridColumns * 4 : gridColumns * 3
            : perf.tier === 'low' ? gridColumns * 3 : perf.tier === 'high' ? gridColumns * 5 : gridColumns * 4
    ), [gridColumns, perf.tier, type]);

    const categoryWarmupChunkSize = useMemo(() => (
        type === 'live'
            ? perf.tier === 'low' ? gridColumns * 3 : perf.tier === 'high' ? gridColumns * 5 : gridColumns * 4
            : perf.tier === 'low' ? gridColumns * 4 : perf.tier === 'high' ? gridColumns * 6 : gridColumns * 5
    ), [gridColumns, perf.tier, type]);

    const hasMoreItems = visibleCount < displayItems.length;
    const serverPagingEligible = useMemo(() => (
        shouldProbeRemoteCatalog && isPrepared
    ), [isPrepared, shouldProbeRemoteCatalog]);

    const fetchRemotePage = useCallback(async (page: number, replace: boolean) => {
        if (remoteLoadingRef.current) return;
        const api = getXtreamAPI();
        if (!api) return;

        remoteLoadingRef.current = true;
        setRemoteLoading(true);
        try {
            const categoryId = selectedCategoryId === 'all' ? undefined : selectedCategoryId;

            const paged = type === 'live'
                ? await api.getLiveStreamsPage({ page, limit: SERVER_PAGE_SIZE, categoryId })
                : type === 'movies'
                    ? await api.getVodStreamsPage({ page, limit: SERVER_PAGE_SIZE, categoryId })
                    : await api.getSeriesPage({ page, limit: SERVER_PAGE_SIZE, categoryId });

            if (!paged.serverPaginated) {
                paginationSupportCache[type] = false;
                setRemotePaginationSupported(false);
                if (partialForType && !needsLocalFullDataset) {
                    ensureFullContent(type);
                }
                return;
            }

            const filteredPagedItems = type === 'live'
                ? sanitizeNamedItems(paged.items as XtreamLiveStream[])
                : sanitizeNamedItems(filterContent(paged.items as any[]));
            const mappedItems = filteredPagedItems.map((entry) => mapToContentItem(entry as any));
            paginationSupportCache[type] = true;
            setRemotePaginationSupported(true);
            setRemotePage(page);
            setRemoteHasMore(paged.hasMore);

            let appendedCount = 0;
            setRemoteItems((prev) => {
                if (replace) return mappedItems;

                const seen = new Set(prev.map((entry) => String(entry.id)));
                const merged = [...prev];
                for (const entry of mappedItems) {
                    const id = String(entry.id);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    merged.push(entry);
                    appendedCount += 1;
                }
                return merged;
            });

            // If next page added nothing, treat as non-paginated/stuck backend and stop requesting more.
            if (!replace && mappedItems.length > 0 && appendedCount === 0) {
                paginationSupportCache[type] = false;
                setRemotePaginationSupported(false);
                setRemoteHasMore(false);
                if (partialForType && !needsLocalFullDataset) {
                    ensureFullContent(type);
                }
            }
        } catch {
            if (replace) {
                paginationSupportCache[type] = false;
                setRemotePaginationSupported(false);
                if (partialForType && !needsLocalFullDataset) {
                    ensureFullContent(type);
                }
            } else {
                setRemoteHasMore(false);
            }
        } finally {
            remoteLoadingRef.current = false;
            setRemoteLoading(false);
        }
    }, [ensureFullContent, filterContent, getXtreamAPI, mapToContentItem, needsLocalFullDataset, partialForType, selectedCategoryId, type]);

    useEffect(() => {
        setRemoteItems([]);
        setRemotePage(0);
        setRemoteHasMore(false);
        setRemotePaginationSupported(paginationSupportCache[type] ?? null);
        remoteLoadingRef.current = false;
    }, [selectedCategoryId, serverPagingEligible, type]);

    useEffect(() => {
        if (!serverPagingEligible) return;
        fetchRemotePage(1, true);
    }, [fetchRemotePage, serverPagingEligible]);

    const useRemoteData = serverPagingEligible && remotePaginationSupported === true && remotePage > 0;
    const listItems = shouldUseGroupedAllSource
        ? groupedAllVisibleItems
        : useRemoteData
            ? remoteItems
            : visibleItems;
    const hasConfirmedEmptyResult = (
        isPrepared &&
        !isDomainBootstrapPending &&
        !isFirstChunkGatePending &&
        displayItems.length === 0 &&
        listItems.length === 0
    );

    useEffect(() => {
        if (!ENABLE_BROWSE_FIRST_RESULT_GATE_V1) return;
        if (listItems.length > 0 || hasConfirmedEmptyResult) {
            setHasSettledFirstResult(true);
        }
    }, [hasConfirmedEmptyResult, listItems.length]);

    useEffect(() => {
        if (!(type === 'movies' && ENABLE_BROWSE_MOVIES_ALL_LAZY_BUILD_V1 && ENABLE_BROWSE_MOVIES_ALL_POST_PAINT_EXPANSION_V1)) {
            return;
        }
        if (!shouldUseGroupedAll) return;
        if (!hasSettledFirstResult) return;

        const nextExpandedTarget = Math.max(moviePoolTargetSize, visibleCount * 3, initialVisibleCount * 2, gridColumns * 12);
        if (nextExpandedTarget <= moviePoolTargetSize) return;

        const task = scheduleIdleWork(() => {
            setMoviePoolTargetSize((prev) => Math.max(prev, nextExpandedTarget));
        });

        return () => task.cancel();
    }, [
        gridColumns,
        hasSettledFirstResult,
        initialVisibleCount,
        moviePoolTargetSize,
        shouldUseGroupedAll,
        type,
        visibleCount,
    ]);

    const isAwaitingFirstSettledResult = (
        ENABLE_BROWSE_FIRST_RESULT_GATE_V1 &&
        !hasSettledFirstResult &&
        !isDomainBootstrapPending &&
        (
            displayItems.length > 0 ||
            rawItemCount > 0 ||
            activeCategories.length > 0 ||
            partialForType ||
            fullContentLoadingForType
        )
    );
    const isWaitingForFirstVisibleItems = (
        ENABLE_BROWSE_EMPTY_STATE_FLASH_FIX_V1 &&
        !isDomainBootstrapPending &&
        isPrepared &&
        !isFirstChunkGatePending &&
        displayItems.length > 0 &&
        listItems.length === 0
    );
    const isBrowseBodyBlocked = (
        ENABLE_BROWSE_HARD_BODY_GATE_V1 &&
        (
            isDomainBootstrapPending ||
            isAwaitingFirstSettledResult ||
            isWaitingForFirstVisibleItems ||
            !isPrepared
        )
    );
    const isInitialCatalogLoading = (
        (serverPagingEligible && remoteLoading && remotePage === 0)
        || !isLoaded
        || isDomainBootstrapPending
        || !isPrepared
        || isFirstChunkGatePending
        || isAwaitingFirstSettledResult
        || isWaitingForFirstVisibleItems
    );

    const sortLabel = useMemo(() => {
        if (sortMode === 'az') return 'A-Z';
        if (sortMode === 'za') return 'Z-A';
        if (sortMode === 'new') return 'Newest';
        return 'Default';
    }, [sortMode]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategoryId !== 'all') count += 1;
        if (searchQuery.trim().length > 0) count += 1;
        if (sortMode !== 'default') count += 1;
        return count;
    }, [searchQuery, selectedCategoryId, sortMode]);

    const shouldUseStableHeaderCount = (
        ENABLE_BROWSE_CACHED_FIRST_PAINT_V1 &&
        selectedCategoryId === 'all' &&
        deferredSearchQuery.trim().length === 0 &&
        sortMode === 'default' &&
        rawItemCount > 0
    );

    const headerResultCountText = useMemo(() => {
        if (isBrowseBodyBlocked) return 'Loading...';
        if (shouldUseStableHeaderCount) return `${rawItemCount} items`;
        if (useRemoteData) return `${remoteItems.length}${remoteHasMore ? '+' : ''} items`;
        return `${displayItems.length} items`;
    }, [
        deferredSearchQuery,
        displayItems.length,
        isBrowseBodyBlocked,
        rawItemCount,
        remoteHasMore,
        remoteItems.length,
        selectedCategoryId,
        shouldUseStableHeaderCount,
        sortMode,
        useRemoteData,
    ]);

    const hasActiveFilters = activeFilterCount > 0;

    const devPagingLabel = useMemo(() => {
        if (!__DEV__) return '';
        if (!serverPagingEligible) return 'Paging: local';
        if (remotePaginationSupported === null) return 'Paging: probing server...';
        if (useRemoteData) {
            const suffix = remoteHasMore ? 'more' : 'end';
            return `Paging: server (p${Math.max(1, remotePage)}, ${suffix})`;
        }
        return 'Paging: fallback (local)';
    }, [
        remoteHasMore,
        remotePage,
        remotePaginationSupported,
        serverPagingEligible,
        useRemoteData,
    ]);

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

    const handleBrowseItemImageLoad = useCallback((item: ContentItem, imageUri?: string) => {
        const normalized = String(imageUri || '').trim();
        if (!normalized) return;

        const key = getBrowseItemKey(item.type, item.id);
        setBrowseImageOverrides((prev) => (
            prev[key] === normalized ? prev : { ...prev, [key]: normalized }
        ));
        setPersistedBrowseImageOverride(key, normalized);
        markPersistedBrowseImageWarm(key);
    }, [getBrowseItemKey]);

    const renderBrowseCard = useCallback((item: ContentItem) => {
        const browseItemKey = getBrowseItemKey(item.type, item.id);
        return (
            <ContentCard
                item={item}
                onPress={handleContentPress}
                onImageLoad={handleBrowseItemImageLoad}
                initialImageWarm={isPersistedBrowseImageWarm(browseItemKey)}
                variant={cardVariant}
                showRating={showRating}
                sizeOverride={{ width: gridCardWidth, height: gridCardHeight }}
                style={styles.card}
            />
        );
    }, [
        cardVariant,
        gridCardHeight,
        gridCardWidth,
        handleBrowseItemImageLoad,
        handleContentPress,
        getBrowseItemKey,
        showRating,
    ]);

    const handleSearchPress = useCallback(() => {
        navigation.navigate('Search');
    }, [navigation]);

    const handleOpenCategories = useCallback(() => {
        setCategoryModalVisible(true);
    }, []);

    const handleCloseCategories = useCallback(() => {
        setCategoryModalVisible(false);
    }, []);

    const handleCategorySelect = useCallback((categoryId: string) => {
        warmBrowseCategoryChunk(categoryId, 'modal-select');
        if (
            ENABLE_BROWSE_CATEGORY_SWITCH_GATE_V1 &&
            categoryId !== selectedCategoryId
        ) {
            setPendingCategoryId(categoryId);
        } else {
            setSelectedCategoryId(categoryId);
        }
        setCategoryModalVisible(false);
    }, [selectedCategoryId, warmBrowseCategoryChunk]);

    const handleSortToggle = useCallback(() => {
        setSortMode((prev) => {
            if (prev === 'default') return 'az';
            if (prev === 'az') return 'za';
            if (prev === 'za') return 'new';
            return 'default';
        });
    }, []);

    const handleResetFilters = useCallback(() => {
        setSearchQuery('');
        setSortMode('default');
        setSelectedCategoryId('all');
    }, []);

    const handleLoadMore = useCallback(() => {
        if (shouldProbeRemoteCatalog && remotePaginationSupported === null) {
            if (remoteLoadingRef.current) return;
            return;
        }

        if (useRemoteData) {
            if (remoteLoadingRef.current || !remoteHasMore) return;
            fetchRemotePage(remotePage + 1, false);
            return;
        }
        if (!isPrepared || !hasMoreItems) return;
        setVisibleCount((prev) => Math.min(prev + visibleStep, displayItems.length));
    }, [
        displayItems.length,
        fetchRemotePage,
        hasMoreItems,
        isPrepared,
        remoteHasMore,
        remotePage,
        remotePaginationSupported,
        shouldProbeRemoteCatalog,
        useRemoteData,
        visibleStep,
    ]);

    const prefetchBrowseImages = useCallback((items: ContentItem[], anchorIndex: number, reason: 'initial' | 'scroll') => {
        if (!ENABLE_BROWSE_PROGRESSIVE_IMAGE_PREFETCH) return;
        if (!items.length) return;

        const startIndex = Math.max(0, anchorIndex - gridColumns);
        const endIndex = Math.min(items.length, startIndex + browsePrefetchWindowSize + browsePrefetchLookAhead);
        const prefetchSlice = items.slice(startIndex, endIndex);
        const nextUris = prefetchSlice
            .map((entry) => entry.image)
            .filter((uri): uri is string => Boolean(uri));

        if (nextUris.length === 0) return;

        const nextKey = `${type}:${selectedCategoryId}:${useRemoteData ? 'remote' : 'local'}:${reason}:${startIndex}:${endIndex}:${items.length}`;
        if (browsePrefetchKeyRef.current === nextKey) return;
        browsePrefetchKeyRef.current = nextKey;

        prefetchImages(nextUris);
    }, [
        browsePrefetchLookAhead,
        browsePrefetchWindowSize,
        gridColumns,
        selectedCategoryId,
        type,
        useRemoteData,
    ]);

    const warmBrowseCategoryChunk = useCallback((categoryId: string, reason: 'modal-open' | 'modal-visible' | 'modal-select') => {
        if (!ENABLE_BROWSE_CATEGORY_MODAL_WARMUP_V1) return;

        const source = categoryMap[categoryId];
        if (!source || source.length === 0) return;

        const warmKey = `${type}:${categoryId}:${reason}`;
        if (warmedBrowseCategoriesRef.current.has(warmKey)) return;

        const nextUris = source
            .slice(0, categoryWarmupChunkSize)
            .map((entry) => entry.image)
            .filter((uri): uri is string => Boolean(uri));

        if (nextUris.length === 0) return;

        warmedBrowseCategoriesRef.current.add(warmKey);
        prefetchImages(nextUris);
    }, [categoryMap, categoryWarmupChunkSize, type]);

    useEffect(() => {
        if (!(ENABLE_BROWSE_PROGRESSIVE_IMAGE_PREFETCH || ENABLE_BROWSE_INITIAL_CHUNK_PREFETCH_V1)) return;
        if (!listItems.length) return;

        prefetchBrowseImages(listItems, 0, 'initial');
    }, [listItems, prefetchBrowseImages]);

    useEffect(() => {
        return () => {
            if (browsePrefetchTimerRef.current) {
                clearTimeout(browsePrefetchTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!ENABLE_BROWSE_CATEGORY_MODAL_WARMUP_V1) return;
        if (!isCategoryModalVisible || !isPrepared) return;

        warmBrowseCategoryChunk(selectedCategoryId, 'modal-open');
    }, [isCategoryModalVisible, isPrepared, selectedCategoryId, warmBrowseCategoryChunk]);

    const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
        if (!(ENABLE_BROWSE_PROGRESSIVE_IMAGE_PREFETCH || ENABLE_BROWSE_SCROLL_LOOKAHEAD_PREFETCH_V1)) return;
        if (!listItems.length) return;

        const firstVisibleIndex = viewableItems
            .map((entry) => entry.index)
            .filter((index): index is number => typeof index === 'number' && index >= 0)
            .reduce((min, index) => Math.min(min, index), Number.POSITIVE_INFINITY);

        if (!Number.isFinite(firstVisibleIndex)) return;

        if (browsePrefetchTimerRef.current) {
            clearTimeout(browsePrefetchTimerRef.current);
        }

        browsePrefetchTimerRef.current = setTimeout(() => {
            prefetchBrowseImages(listItems, firstVisibleIndex, 'scroll');
        }, perf.tier === 'low' ? 180 : 120);
    }, [listItems, perf.tier, prefetchBrowseImages]);

    const viewabilityConfig = useMemo(() => ({
        itemVisiblePercentThreshold: 55,
        minimumViewTime: perf.tier === 'low' ? 80 : 40,
    }), [perf.tier]);

    const modalCategoryViewabilityConfig = useMemo(() => ({
        itemVisiblePercentThreshold: 60,
        minimumViewTime: perf.tier === 'low' ? 120 : 80,
    }), [perf.tier]);

    const handleCategoryModalViewableItemsChanged = useCallback((
        { viewableItems }: { viewableItems: Array<{ item?: CategoryItem | null }> }
    ) => {
        if (!ENABLE_BROWSE_CATEGORY_MODAL_WARMUP_V1) return;

        for (const entry of viewableItems) {
            const category = entry.item;
            if (!category?.id) continue;
            warmBrowseCategoryChunk(category.id, 'modal-visible');
        }
    }, [warmBrowseCategoryChunk]);

    const renderItem = useCallback(({ item }: { item: ContentItem; index: number }) => (
        <View>{renderBrowseCard(item)}</View>
    ), [renderBrowseCard]);

    const renderGroupedItem = useCallback(({ item }: { item: GroupedBrowseEntry }) => {
        if (item.type === 'header') {
            return (
                <View style={styles.groupHeader}>
                    <Text style={styles.groupHeaderText}>{item.title}</Text>
                    <View style={styles.groupCountBadge}>
                        <Text style={styles.groupCountText}>{item.count}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.groupRow}>
                {item.items.map((contentItem) => (
                    <View key={String(contentItem.id)} style={{ width: gridCardWidth }}>
                        {renderBrowseCard(contentItem)}
                    </View>
                ))}
                {Array.from({ length: Math.max(0, gridColumns - item.items.length) }).map((_, index) => (
                    <View key={`spacer:${item.id}:${index}`} style={{ width: gridCardWidth }} />
                ))}
            </View>
        );
    }, [gridCardWidth, gridColumns, renderBrowseCard]);

    const keyExtractor = useCallback((item: ContentItem) => String(item.id), []);
    const groupedKeyExtractor = useCallback((item: GroupedBrowseEntry) => item.id, []);

    const emptyState = useMemo(() => {
        if (serverPagingEligible && remoteLoading && remotePage === 0) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.emptyText}>Loading catalog...</Text>
                </View>
            );
        }

        if (!isLoaded || !isPrepared) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <Icon name="monitor" size={48} color={colors.textMuted} weight="thin" />
                <Text style={styles.emptyText}>
                    {searchQuery.trim().length > 0
                        ? `No results for "${searchQuery.trim()}"`
                        : 'No items found in this category'}
                </Text>
            </View>
        );
    }, [isLoaded, isPrepared, remoteLoading, remotePage, searchQuery, serverPagingEligible]);

    const listFooter = useMemo(() => {
        if (isInitialCatalogLoading || listItems.length === 0) {
            return null;
        }

        if (shouldProbeRemoteCatalog && remotePaginationSupported === null && remoteLoading) {
            return (
                <View style={styles.listFooter}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={styles.listFooterText}>Preparing paged catalog...</Text>
                </View>
            );
        }

        if (useRemoteData) {
            if (!remoteLoading) {
                return <View style={styles.listFooterSpacer} />;
            }
            return (
                <View style={styles.listFooter}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={styles.listFooterText}>Loading page...</Text>
                </View>
            );
        }

        if (!isPrepared || !hasMoreItems) {
            return <View style={styles.listFooterSpacer} />;
        }

        return (
            <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.listFooterText}>Loading more...</Text>
            </View>
        );
    }, [hasMoreItems, isInitialCatalogLoading, isPrepared, listItems.length, remoteLoading, remotePaginationSupported, shouldProbeRemoteCatalog, useRemoteData]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title={headerTitle}
                showBack
                showSearch
                onSearchPress={handleSearchPress}
            />

            <View style={styles.categorySection}>
                <View style={styles.categoryRow}>
                    <View style={styles.leftFilterGroup}>
                        <TouchableOpacity
                            style={styles.categoryDropdown}
                            onPress={handleOpenCategories}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.categoryDropdownText}>Categories</Text>
                            <Icon name="caretDown" size={12} color={colors.textSecondary} weight="bold" />
                        </TouchableOpacity>

                        <Text style={styles.selectionText} numberOfLines={1}>
                            {selectedCategoryLabel}
                        </Text>
                    </View>
                    <View style={styles.resultsMetaWrap}>
                        <Text style={styles.resultsCountText}>
                            {headerResultCountText}
                        </Text>
                        {hasActiveFilters && (
                            <View style={styles.activeFilterBadge}>
                                <Text style={styles.activeFilterBadgeText}>{activeFilterCount} filters</Text>
                            </View>
                        )}
                    </View>
                </View>
                {__DEV__ && devPagingLabel.length > 0 && (
                    <View style={styles.devPagingBadge}>
                        <Text style={styles.devPagingText}>{devPagingLabel}</Text>
                    </View>
                )}

                <View style={styles.toolsRow}>
                    <View style={styles.searchBox}>
                        <Icon name="magnifyingGlass" size={15} color={colors.textMuted} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            placeholder={`Search ${headerTitle.toLowerCase()}`}
                            placeholderTextColor={colors.textMuted}
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearSearchButton}
                                onPress={() => setSearchQuery('')}
                                activeOpacity={0.7}
                            >
                                <Icon name="x" size={14} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.sortChip, sortMode !== 'default' && styles.sortChipActive]}
                        onPress={handleSortToggle}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.sortChipText, sortMode !== 'default' && styles.sortChipTextActive]}>
                            {sortLabel}
                        </Text>
                    </TouchableOpacity>

                    {hasActiveFilters && (
                        <TouchableOpacity
                            style={styles.resetChip}
                            onPress={handleResetFilters}
                            activeOpacity={0.8}
                        >
                            <Icon name="arrowCounterClockwise" size={13} color={colors.textSecondary} />
                            <Text style={styles.resetChipText}>Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isBrowseBodyBlocked ? (
                <View style={styles.bodyLoadingState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.bodyLoadingText}>Loading content...</Text>
                </View>
            ) : shouldUseGroupedAllSource && !ENABLE_BROWSE_GROUPED_ALL_HIDDEN_SECTIONS_V1 ? (
                <FlashList
                    data={groupedAllEntries}
                    renderItem={renderGroupedItem}
                    keyExtractor={groupedKeyExtractor}
                    key={`grouped-all-${type}-${gridColumns}`}
                    // @ts-ignore FlashList runtime supports estimatedItemSize
                    estimatedItemSize={estimatedItemSize}
                    drawDistance={perf.home.drawDistance}
                    initialNumToRender={perf.grid.initialRows * 2}
                    maxToRenderPerBatch={perf.grid.maxRenderBatchRows * 2}
                    updateCellsBatchingPeriod={perf.grid.updateCellsBatchingPeriod}
                    windowSize={perf.grid.windowSize}
                    removeClippedSubviews={false}
                    contentContainerStyle={[
                        styles.gridContent,
                        {
                            paddingHorizontal: gridSideInset,
                            paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER,
                        }
                    ]}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListEmptyComponent={emptyState}
                    ListFooterComponent={listFooter}
                />
            ) : (
                <FlashList
                    data={listItems}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    numColumns={gridColumns}
                    key={`grid-${type}-${gridColumns}`}
                    // @ts-ignore FlashList runtime supports estimatedItemSize
                    estimatedItemSize={estimatedItemSize}
                    drawDistance={perf.home.drawDistance}
                    initialNumToRender={gridColumns * perf.grid.initialRows}
                    maxToRenderPerBatch={gridColumns * perf.grid.maxRenderBatchRows}
                    updateCellsBatchingPeriod={perf.grid.updateCellsBatchingPeriod}
                    windowSize={perf.grid.windowSize}
                    removeClippedSubviews={false}
                    contentContainerStyle={[
                        styles.gridContent,
                        {
                            paddingHorizontal: gridSideInset,
                            paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER,
                        }
                    ]}
                    columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
                    showsVerticalScrollIndicator={false}
                    onViewableItemsChanged={handleViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListEmptyComponent={emptyState}
                    ListFooterComponent={listFooter}
                />
            )}

            <Modal
                visible={isCategoryModalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseCategories}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={handleCloseCategories} />
                    <View style={[styles.modalContent, { paddingTop: insets.top + spacing.xl }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{headerTitle} Categories</Text>
                            <TouchableOpacity onPress={handleCloseCategories} style={styles.modalCloseBtn}>
                                <Icon name="x" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <FlashList
                            data={categoryItems}
                            keyExtractor={(item) => item.id}
                            onViewableItemsChanged={handleCategoryModalViewableItemsChanged}
                            viewabilityConfig={modalCategoryViewabilityConfig}
                            renderItem={({ item }) => {
                                const isSelected = item.id === selectedCategoryId;
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                                        onPress={() => handleCategorySelect(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.modalItemTextRow}>
                                            <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                                                {item.name}
                                            </Text>
                                            {typeof item.count === 'number' ? (
                                                <View style={styles.countBadge}>
                                                    <Text style={styles.modalItemCount}>{item.count}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        {isSelected && (
                                            <Icon name="check" size={20} color={accentColor} weight="bold" />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            // @ts-ignore FlashList runtime supports estimatedItemSize
                            estimatedItemSize={56}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[styles.modalListContent, { paddingBottom: insets.bottom + spacing.md }]}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    categorySection: {
        marginHorizontal: spacing.base,
        marginBottom: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftFilterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    categoryDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: borderRadius.round,
        gap: 6,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        flexShrink: 0,
    },
    categoryDropdownText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    selectionText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        flexShrink: 1,
    },
    resultsMetaWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    resultsCountText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activeFilterBadge: {
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.primaryLight,
        backgroundColor: 'rgba(229, 9, 20, 0.14)',
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
    },
    activeFilterBadgeText: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    devPagingBadge: {
        marginTop: spacing.xs,
        alignSelf: 'flex-start',
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    devPagingText: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    toolsRow: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    searchBox: {
        flex: 1,
        minHeight: 46,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundInput,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 13,
        paddingVertical: spacing.xs,
    },
    clearSearchButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundElevated,
    },
    sortChip: {
        minHeight: 46,
        minWidth: 72,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundInput,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
    },
    sortChipActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.backgroundElevated,
    },
    sortChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sortChipTextActive: {
        color: colors.textPrimary,
    },
    resetChip: {
        minHeight: 46,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundInput,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        gap: spacing.xxs,
    },
    resetChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    gridContent: {
        paddingTop: spacing.sm,
    },
    gridRow: {
        justifyContent: 'flex-start',
        gap: GRID_COLUMN_GAP,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    groupHeaderText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
    },
    groupCountBadge: {
        alignSelf: 'flex-start',
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
    },
    groupCountText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
    },
    groupRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: GRID_COLUMN_GAP,
        marginBottom: GRID_COLUMN_GAP,
    },
    card: {
        marginRight: 0,
    },
    emptyState: {
        flex: 1,
        minHeight: 400,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    bodyLoadingState: {
        flex: 1,
        minHeight: 400,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    bodyLoadingText: {
        color: colors.textMuted,
        fontSize: 15,
        fontWeight: '500',
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 15,
        fontWeight: '500',
    },
    listFooter: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    listFooterText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    listFooterSpacer: {
        height: spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: 60,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
        paddingTop: spacing.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalListContent: {
        paddingBottom: spacing.base,
    },
    modalItem: {
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalItemSelected: {
        backgroundColor: colors.backgroundInput,
        borderColor: colors.borderMedium,
    },
    modalItemTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flexShrink: 1,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textSecondary,
        flexShrink: 1,
    },
    modalItemTextSelected: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    countBadge: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    modalItemCount: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
    },
});

export default BrowseScreen;
