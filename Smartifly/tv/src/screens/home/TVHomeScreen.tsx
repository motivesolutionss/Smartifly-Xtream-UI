/**
 * Smartifly TV Home Screen - Netflix-Grade Edition
 *
 * Performance upgrades:
 * - Home stays mounted (no reload on sidebar navigation)
 * - While loading, render ONLY the placeholder (avoid rendering heavy FlashList underneath)
 * - Reduce unnecessary allocations in render paths
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Animated,
    View,
    Text,
    StyleSheet,
    BackHandler,
    StatusBar,
    Easing,
    findNodeHandle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';

import useStore from '@smartifly/shared/src/store';
import { colors, scale, scaleFont } from '../../theme';

import TVSidebar, { SidebarRoute } from './components/TVSidebar';
import TVHeroBanner, { TVHeroItem } from './components/TVHeroBanner';
import TVContentRail from './components/TVContentRail';
import TVContinueRail from './components/TVContinueRail';
import { TVContentItem } from './components/TVContentCard';

import useWatchHistoryStore, { WatchProgress } from '@smartifly/shared/src/store/watchHistoryStore';

import TVLiveScreen from '../TVLiveScreen';
import TVMoviesScreen from '../TVMoviesScreen';
import TVSeriesScreen from '../TVSeriesScreen';
import TVSearchScreen from './TVSearchScreen';
import TVAnnouncementsScreen from '../TVAnnouncementsScreen';
import TVSettingsScreen from '../TVSettingsScreen';
import TVFavoritesScreen from './TVFavoritesScreen';
import TVDownloadsScreen from '../TVDownloadsScreen';

import TVLoadingState from '../components/TVLoadingState';
import { prefetchImages } from '@smartifly/shared/src/utils/image';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import {
    PreparedHeroDetails,
    getCachedHeroDetails,
    optimizeHeroBackdropUri,
} from '@smartifly/shared/src/services/HeroPreparationService';

// Netflix-grade resolver
import { useHomeRails } from './hooks/useHomeRails';
import { TVHomeScreenProps, MovieItem, SeriesItem } from '../../navigation/types';

const isUsableUri = (value?: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^(https?:\/\/|\/\/|file:\/\/|content:\/\/|data:|asset:)/i.test(trimmed);
};

type HomeSection =
    | {
        key: string;
        type: 'continue';
        data: WatchProgress[];
        lift: boolean;
    }
    | {
        key: string;
        type: 'rail';
        rail: { id: string; title: string; type?: string; items: TVContentItem[] };
        lift: boolean;
    };

// =============================================================================
// PREFETCH CONFIG
// =============================================================================

const HOME_DRAW_DISTANCE = scale(900);

const PLACEHOLDER_RAIL_COUNT = 3;
const PLACEHOLDER_CARDS_PER_RAIL = 6;

const HERO_BANNER_HEIGHT = scale(820);
const HERO_BANNER_MARGIN = scale(28);
const CONTINUE_SECTION_ESTIMATE = scale(250);
const LIVE_SECTION_ESTIMATE = scale(240);
const CONTENT_SECTION_ESTIMATE = scale(430);

// =============================================================================
// HOME PLACEHOLDERS
// =============================================================================

const HomePlaceholderRail: React.FC<{ index: number }> = ({ index }) => (
    <View style={styles.placeholderRail}>
        <View
            style={[
                styles.placeholderTitle,
                { width: index % 2 === 0 ? scale(220) : scale(180) },
            ]}
        />
        <View style={styles.placeholderRow}>
            {Array.from({ length: PLACEHOLDER_CARDS_PER_RAIL }).map((_, cardIndex) => (
                <View key={`${index}-${cardIndex}`} style={styles.placeholderCard} />
            ))}
        </View>
    </View>
);

const HeroSkeleton: React.FC<{ contentOffset?: number }> = ({ contentOffset = 0 }) => (
    <View style={styles.placeholderHero}>
        <View style={styles.placeholderHeroBackdrop} />
        <View style={[styles.placeholderHeroContent, contentOffset ? { left: contentOffset } : null]}>
            <View style={[styles.placeholderLine, { width: scale(140) }]} />
            <View style={[styles.placeholderLine, { width: scale(360), height: scale(18) }]} />
            <View style={[styles.placeholderLine, { width: scale(280), height: scale(18) }]} />
            <View style={[styles.placeholderLine, { width: scale(220), height: scale(18) }]} />

            <View style={styles.placeholderButtonRow}>
                <View style={styles.placeholderButtonPrimary} />
                <View style={styles.placeholderButtonSecondary} />
            </View>
        </View>
    </View>
);

const TVHomePlaceholder: React.FC = () => (
    <View style={styles.placeholderContainerInner}>
        <Text style={styles.placeholderLabel}>Loading Home...</Text>
        <TVLoadingState size="large" style={styles.placeholderSpinner} />

        <HeroSkeleton />

        {Array.from({ length: PLACEHOLDER_RAIL_COUNT }).map((_, index) => (
            <HomePlaceholderRail key={`placeholder-rail-${index}`} index={index} />
        ))}
    </View>
);

const HeroPlaceholder: React.FC = React.memo(() => (
    <View style={styles.heroPlaceholderWrapper}>
        <HeroSkeleton contentOffset={scale(30)} />
    </View>
));

// =============================================================================
// HOME SECTION (always mounted; visibility handled by parent)
// =============================================================================

type HomeSectionProps = {
    navigation: TVHomeScreenProps['navigation'];
    searchRef: React.RefObject<View | null>;
    sidebarHomeNode?: number;
    heroPlayRef?: React.Ref<View>;
    activeRoute: SidebarRoute;
    isInteracted: boolean;
};

const pickBackdrop = (...values: any[]): string | undefined => {
    for (const value of values) {
        if (Array.isArray(value)) {
            for (const entry of value) {
                const optimized = optimizeHeroBackdropUri(entry);
                if (optimized) return optimized;
            }
            continue;
        }
        const optimized = optimizeHeroBackdropUri(value);
        if (optimized) return optimized;
    }
    return undefined;
};

const HomeSection: React.FC<HomeSectionProps> = React.memo(({ navigation, searchRef, sidebarHomeNode, heroPlayRef, activeRoute, isInteracted }) => {
    const { rails, continueWatching, hero, isLoading } = useHomeRails();
    const perf = usePerfProfile();
    const prefetchRailsLimit = perf.tier === 'low' ? 2 : perf.tier === 'high' ? 5 : 4;
    const prefetchItemsPerRail = perf.tier === 'low' ? 4 : perf.tier === 'high' ? 8 : 6;
    const drawDistance = perf.home.drawDistance || HOME_DRAW_DISTANCE;

    const moviesItems = useStore((state) => state.content.movies.items);
    const seriesItems = useStore((state) => state.content.series.items);
    const removeFromHistory = useWatchHistoryStore((state) => state.removeFromHistory);

    const [stableHero, setStableHero] = useState<TVHeroItem | null>(null);
    const stableHeroIdRef = useRef<string>('');
    const prefetchedImages = useRef<Set<string>>(new Set());
    const heroId = hero ? String(hero.id) : '';

    const handleContentPress = useCallback(
        (item: TVContentItem | any) => {
            if (item.type === 'live') {
                if (item.data) {
                    navigation.navigate('FullscreenPlayer', { type: 'live', item: item.data });
                }
            } else if (item.type === 'movie') {
                if (item.data) {
                    navigation.navigate('TVMovieDetail', { movie: item.data });
                }
            } else if (item.type === 'series') {
                if (item.data) {
                    navigation.navigate('TVSeriesDetail', { series: item.data });
                }
            }
        },
        [navigation]
    );

    const handleContinuePress = useCallback(
        (item: WatchProgress) => {
            if (item.type === 'movie') {
                const movieItem =
                    (item.data as MovieItem) ??
                    ({
                        stream_id: item.streamId,
                        name: item.title,
                        stream_icon: item.thumbnail,
                    } as MovieItem);

                navigation.navigate('FullscreenPlayer', {
                    type: 'movie',
                    item: movieItem,
                    resumePosition: item.position,
                });
            } else if (item.type === 'series') {
                const seriesItem =
                    (item.data as SeriesItem) ??
                    ({
                        stream_id: item.streamId,
                        id: item.streamId,
                        name: item.episodeTitle || item.title,
                    } as any);

                navigation.navigate('FullscreenPlayer', {
                    type: 'series',
                    item: seriesItem,
                    resumePosition: item.position,
                });
            }
        },
        [navigation]
    );

    const handleHeroPlay = useCallback(() => {
        if (stableHero) handleContentPress(stableHero as any);
    }, [stableHero, handleContentPress]);

    const handleHeroInfo = useCallback(() => {
        if (stableHero) handleContentPress(stableHero as any);
    }, [stableHero, handleContentPress]);

    const heroItem = useMemo<TVHeroItem | null>(() => {
        if (!hero) return null;

        const details: Partial<PreparedHeroDetails> = getCachedHeroDetails(heroId) ?? {};
        const resolvedBackdrop = pickBackdrop(hero.backdrop, details.backdrop);

        return {
            ...hero,
            ...details,
            description: details.description || hero.description,
            rating: details.rating ?? hero.rating,
            tags: details.tags?.length ? details.tags : hero.tags,
            year: details.year,
            backdrop: resolvedBackdrop,
        };
    }, [hero, heroId]);

    useEffect(() => {
        if (!heroItem) return;

        const nextId = String(heroItem.id);
        if (stableHeroIdRef.current === nextId) return;

        stableHeroIdRef.current = nextId;
        setStableHero(heroItem);
    }, [heroItem]);

    const heroSlotItem = stableHero ?? heroItem;

    const continueWatchingResolved = useMemo<WatchProgress[]>(() => {
        if (!continueWatching.length) return continueWatching;

        const movieById = new Map<number, any>();
        for (const movie of moviesItems || []) {
            const id = Number((movie as any)?.stream_id);
            if (Number.isFinite(id) && id > 0) {
                movieById.set(id, movie);
            }
        }

        const seriesById = new Map<number, any>();
        for (const series of seriesItems || []) {
            const id = Number((series as any)?.series_id);
            if (Number.isFinite(id) && id > 0) {
                seriesById.set(id, series);
            }
        }

        return continueWatching.map((entry) => {
            const data = (entry.data || {}) as any;
            const movieId = Number(data?.stream_id ?? entry.streamId);
            const seriesId = Number(data?.series_id ?? entry.seriesId);

            const movie = entry.type === 'movie' ? movieById.get(movieId) : undefined;
            const series = entry.type === 'series' ? seriesById.get(seriesId) : undefined;

            const resolvedBackdrop = pickBackdrop(
                Array.isArray(data?.backdrop_path) ? data.backdrop_path[0] : data?.backdrop_path,
                data?.backdrop,
                data?.cover_big,
                data?.movie_image,
                data?.cover,
                Array.isArray(movie?.backdrop_path) ? movie.backdrop_path[0] : movie?.backdrop_path,
                movie?.backdrop,
                movie?.cover_big,
                movie?.movie_image,
                movie?.cover,
                Array.isArray(series?.backdrop_path) ? series.backdrop_path[0] : series?.backdrop_path,
                series?.backdrop,
                series?.cover_big,
                series?.cover,
                entry.thumbnail
            );

            if (!resolvedBackdrop || resolvedBackdrop === entry.thumbnail) return entry;
            return { ...entry, thumbnail: resolvedBackdrop };
        });
    }, [continueWatching, moviesItems, seriesItems]);

    useEffect(() => {
        if (isLoading) return;

        const essential: string[] = [];
        const secondary: string[] = [];

        const pushUnique = (bucket: string[], u?: string) => {
            if (!u) return;
            if (prefetchedImages.current.has(u)) return;
            prefetchedImages.current.add(u);
            bucket.push(u);
        };

        pushUnique(essential, stableHero?.backdrop);
        pushUnique(essential, heroItem?.backdrop);

        for (const item of continueWatchingResolved.slice(0, prefetchItemsPerRail)) {
            pushUnique(secondary, item.thumbnail);
        }

        for (const rail of rails.slice(0, prefetchRailsLimit)) {
            const items = (rail.items as TVContentItem[]).slice(0, prefetchItemsPerRail);
            for (const item of items) pushUnique(secondary, item.image);
        }

        const essentialDelay = perf.tier === 'low' ? 450 : 220;
        const secondaryDelay = perf.tier === 'low' ? 0 : 120;

        const essentialTimer = setTimeout(() => {
            if (essential.length > 0) {
                prefetchImages(essential);
            }
        }, essentialDelay);

        let secondaryTimer: ReturnType<typeof setTimeout> | undefined;
        if (isInteracted && secondary.length > 0) {
            secondaryTimer = setTimeout(() => {
                prefetchImages(secondary);
            }, secondaryDelay);
        }

        return () => {
            clearTimeout(essentialTimer);
            if (secondaryTimer) clearTimeout(secondaryTimer);
        };
    }, [
        isLoading,
        stableHero?.backdrop,
        heroItem?.backdrop,
        continueWatchingResolved,
        rails,
        prefetchItemsPerRail,
        prefetchRailsLimit,
        perf.tier,
        isInteracted,
    ]);

    const continueSections = useMemo<HomeSection[]>(() => {
        if (continueWatchingResolved.length === 0) return [];
        return [
            {
                key: 'continue',
                type: 'continue',
                data: continueWatchingResolved,
                lift: true,
            },
        ];
    }, [continueWatchingResolved]);

    const railSections = useMemo<HomeSection[]>(() => {
        let liftNext = continueSections.length === 0;
        return rails.map((rail) => {
            const section: HomeSection = {
                key: `rail-${rail.id}`,
                type: 'rail',
                rail: {
                    id: rail.id,
                    title: rail.title,
                    type: rail.type,
                    items: rail.items as TVContentItem[],
                },
                lift: liftNext,
            };
            liftNext = false;
            return section;
        });
    }, [continueSections.length, rails]);

    const listSections = useMemo<HomeSection[]>(() => {
        return [...continueSections, ...railSections];
    }, [continueSections, railSections]);

    const getItemType = useCallback((item: HomeSection) => item.type, []);
    const overrideItemLayout = useCallback(
        (layout: { size?: number; span?: number }, item: HomeSection) => {
            switch (item.type) {
                case 'continue':
                    layout.size = CONTINUE_SECTION_ESTIMATE;
                    break;
                case 'rail':
                    layout.size = item.rail.items[0]?.type === 'live'
                        ? LIVE_SECTION_ESTIMATE
                        : CONTENT_SECTION_ESTIMATE;
                    break;
                default:
                    layout.size = CONTENT_SECTION_ESTIMATE;
                    break;
            }
        },
        []
    );

    const renderHeroHeader = useCallback(() => {
        if (!heroSlotItem) {
            return <HeroPlaceholder />;
        }
        return (
            <TVHeroBanner
                item={heroSlotItem}
                onPlay={handleHeroPlay}
                onInfo={handleHeroInfo}
                sidebarTargetRef={searchRef}
                primaryActionRef={heroPlayRef}
                hasPreferredFocus={activeRoute === 'Home' && !isInteracted}
            />
        );
    }, [heroSlotItem, handleHeroPlay, handleHeroInfo, searchRef, heroPlayRef, activeRoute, isInteracted]);

    const renderHomeItem = useCallback(
        ({ item }: { item: HomeSection }) => {
            switch (item.type) {
                case 'continue':
                    return (
                        <View style={[styles.railsWrapper, item.lift && styles.railsLift]}>
                            <TVContinueRail
                                title="Continue Watching"
                                data={item.data}
                                onPressItem={handleContinuePress}
                                onRemoveItem={(entry) => removeFromHistory(entry.id)}
                                sidebarTargetNode={sidebarHomeNode}
                            />
                        </View>
                    );

                case 'rail':
                    return (
                        <View style={[styles.railsWrapper, item.lift && styles.railsLift]}>
                            <TVContentRail
                                title={item.rail.title}
                                data={item.rail.items}
                                onPressItem={handleContentPress}
                                sidebarTargetNode={sidebarHomeNode}
                            />
                        </View>
                    );

                default:
                    return null;
            }
        },
        [handleContinuePress, handleContentPress, removeFromHistory, sidebarHomeNode]
    );

    // While loading: render ONLY placeholder (avoid heavy list underneath)
    if (isLoading && continueSections.length === 0) {
        return (
            <View style={styles.homeSection}>
                <View style={styles.placeholderOverlayLocal}>
                    <TVHomePlaceholder />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.homeSection}>
            <FlashList
                style={styles.scrollViewWithSidebarGap}
                contentContainerStyle={styles.scrollContent}
                data={listSections}
                renderItem={renderHomeItem}
                keyExtractor={(item) => item.key}
                ListHeaderComponent={renderHeroHeader}
                // @ts-ignore
                estimatedItemSize={CONTENT_SECTION_ESTIMATE}
                getItemType={getItemType}
                overrideItemLayout={overrideItemLayout}
                drawDistance={drawDistance}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
            />
        </View>
    );
});

// =============================================================================
// TV HOME SCREEN COMPONENT (Shell)
// =============================================================================

const TVHomeScreen: React.FC<TVHomeScreenProps> = ({ navigation }) => {
    const [activeRoute, setActiveRoute] = useState<SidebarRoute>('Home');
    const [isInteracted, setIsInteracted] = useState(false);
    const [focusTargets, setFocusTargets] = useState<Record<string, number | undefined>>({});
    const [sidebarHomeNode, setSidebarHomeNode] = useState<number | undefined>(undefined);
    const searchRef = useRef<View | null>(null);
    const contentFade = useRef(new Animated.Value(1)).current;
    const contentShift = useRef(new Animated.Value(0)).current;

    const updateFocusTarget = useCallback((route: string, node: View | null) => {
        if (!node) {
            setFocusTargets((prev) => (prev[route] ? { ...prev, [route]: undefined } : prev));
            return;
        }

        const handle = findNodeHandle(node);
        if (!handle) return;

        setFocusTargets((prev) => (prev[route] === handle ? prev : { ...prev, [route]: handle }));
        setIsInteracted((prev) => (prev ? prev : true));
    }, []);

    const homeFocusRef = useCallback((node: View | null) => updateFocusTarget('Home', node), [updateFocusTarget]);
    const liveFocusRef = useCallback((node: View | null) => updateFocusTarget('Live', node), [updateFocusTarget]);
    const moviesFocusRef = useCallback((node: View | null) => updateFocusTarget('Movies', node), [updateFocusTarget]);
    const seriesFocusRef = useCallback((node: View | null) => updateFocusTarget('Series', node), [updateFocusTarget]);
    const searchFocusRef = useCallback((node: View | null) => updateFocusTarget('Search', node), [updateFocusTarget]);
    const favoritesFocusRef = useCallback((node: View | null) => updateFocusTarget('Favorites', node), [updateFocusTarget]);
    const downloadsFocusRef = useCallback((node: View | null) => updateFocusTarget('Downloads', node), [updateFocusTarget]);
    const settingsFocusRef = useCallback((node: View | null) => updateFocusTarget('Settings', node), [updateFocusTarget]);
    const announcementsFocusRef = useCallback((node: View | null) => updateFocusTarget('Announcements', node), [updateFocusTarget]);

    // BACK HANDLER
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (activeRoute !== 'Home') {
                    setActiveRoute('Home');
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [activeRoute])
    );

    const handleNavigate = useCallback((route: SidebarRoute) => {
        setActiveRoute(route);
    }, []);

    useEffect(() => {
        // Keep transition subtle to avoid a "shock" feel on TV.
        contentFade.stopAnimation();
        contentShift.stopAnimation();
        contentFade.setValue(0.97);
        contentShift.setValue(0);

        Animated.timing(contentFade, {
            toValue: 1,
            duration: 140,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [activeRoute, contentFade, contentShift]);

    const contentTransitionStyle = useMemo(
        () => ({
            opacity: contentFade,
            transform: [{ translateX: contentShift }],
        }),
        [contentFade, contentShift]
    );

    const renderActiveSection = useCallback(() => {
        let node: React.ReactNode = null;
        let withSidebarGap = true;

        switch (activeRoute) {
            case 'Home':
                withSidebarGap = false;
                node = (
                    <HomeSection
                        navigation={navigation}
                        searchRef={searchRef}
                        sidebarHomeNode={sidebarHomeNode}
                        heroPlayRef={homeFocusRef}
                        activeRoute={activeRoute}
                        isInteracted={isInteracted}
                    />
                );
                break;
            case 'Live':
                node = <TVLiveScreen navigation={navigation} focusEntryRef={liveFocusRef} />;
                break;
            case 'Movies':
                node = <TVMoviesScreen navigation={navigation} focusEntryRef={moviesFocusRef} />;
                break;
            case 'Series':
                node = <TVSeriesScreen navigation={navigation} focusEntryRef={seriesFocusRef} />;
                break;
            case 'Announcements':
                node = <TVAnnouncementsScreen navigation={navigation} focusEntryRef={announcementsFocusRef} />;
                break;
            case 'Search':
                node = <TVSearchScreen navigation={navigation} focusEntryRef={searchFocusRef} />;
                break;
            case 'Favorites':
                node = <TVFavoritesScreen navigation={navigation} focusEntryRef={favoritesFocusRef} />;
                break;
            case 'Downloads':
                node = <TVDownloadsScreen navigation={navigation} focusEntryRef={downloadsFocusRef} />;
                break;
            case 'Settings':
                node = <TVSettingsScreen navigation={navigation} focusEntryRef={settingsFocusRef} />;
                break;
            default:
                return null;
        }

        return (
            <View
                pointerEvents="auto"
                style={[
                    styles.sectionBase,
                    withSidebarGap && styles.sectionWithSidebar,
                    styles.sectionVisible,
                ]}
            >
                {node}
            </View>
        );
    }, [
        activeRoute,
        navigation,
        searchRef,
        sidebarHomeNode,
        homeFocusRef,
        isInteracted,
        liveFocusRef,
        moviesFocusRef,
        seriesFocusRef,
        announcementsFocusRef,
        searchFocusRef,
        favoritesFocusRef,
        downloadsFocusRef,
        settingsFocusRef,
    ]);

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />

            {/* Sidebar Overlay (Fixed Position) */}
            <View style={styles.sidebarWrapper}>
                <TVSidebar
                    activeRoute={activeRoute}
                    onNavigate={handleNavigate}
                    isExpanded={false}
                    onExpand={() => { }}
                    onCollapse={() => { }}
                    onProfilePress={() => navigation.navigate('ProfileSwitcher')}
                    searchRef={searchRef}
                    onHomeNodeReady={setSidebarHomeNode}
                    // @ts-ignore - Prop exists in TVSidebar but TS server sometimes fails to resolve it after interface updates
                    focusTargets={focusTargets}
                />
            </View>

            {/* Main Content Area */}
            <Animated.View style={[styles.contentContainer, contentTransitionStyle]}>
                {renderActiveSection()}
            </Animated.View>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        flexDirection: 'row',
    },
    sidebarWrapper: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        width: scale(130),
    },
    contentContainer: {
        flex: 1,
        height: '100%',
        backgroundColor: colors.background,
        position: 'relative',
    },
    homeSection: {
        flex: 1,
    },
    sectionBase: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    sectionVisible: {
        opacity: 1,
        zIndex: 2,
        display: 'flex',
    },
    sectionHidden: {
        opacity: 0,
        zIndex: 1,
        display: 'none',
    },
    sectionWithSidebar: {
        marginLeft: scale(130),
    },

    // Home list styles
    scrollViewWithSidebarGap: {
        flex: 1,
        marginLeft: scale(130),
    },
    scrollContent: {
        paddingBottom: scale(50),
    },

    // Placeholder styles
    placeholderOverlayLocal: {
        flex: 1,
        marginLeft: scale(130),
        backgroundColor: colors.background,
    },
    placeholderContainerInner: {
        paddingBottom: scale(60),
        paddingLeft: scale(30),
        paddingRight: scale(30),
        paddingTop: scale(24),
        opacity: 0.95,
    },
    placeholderLabel: {
        fontSize: scaleFont(16),
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: scale(12),
        letterSpacing: 1,
    },
    placeholderSpinner: {
        alignItems: 'flex-start',
        marginBottom: scale(24),
    },
    heroPlaceholderWrapper: {
        width: '100%',
    },
    placeholderHero: {
        width: '100%',
        height: HERO_BANNER_HEIGHT,
        marginBottom: HERO_BANNER_MARGIN,
        position: 'relative',
    },
    placeholderHeroBackdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '74%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: scale(10),
    },
    placeholderHeroContent: {
        position: 'absolute',
        left: 0,
        bottom: scale(152),
        width: '60%',
    },
    placeholderLine: {
        height: scale(14),
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: scale(6),
        marginBottom: scale(10),
    },
    placeholderButtonRow: {
        flexDirection: 'row',
        marginTop: scale(10),
    },
    placeholderButtonPrimary: {
        width: scale(170),
        height: scale(46),
        backgroundColor: 'rgba(229, 9, 20, 0.5)',
        borderRadius: scale(6),
        marginRight: scale(16),
    },
    placeholderButtonSecondary: {
        width: scale(170),
        height: scale(46),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: scale(6),
    },
    placeholderRail: {
        marginBottom: scale(28),
    },
    placeholderTitle: {
        height: scale(18),
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderRadius: scale(6),
        marginBottom: scale(12),
    },
    placeholderRow: {
        flexDirection: 'row',
        paddingRight: scale(80),
    },
    placeholderCard: {
        width: scale(200),
        height: scale(280),
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: scale(8),
        marginRight: scale(24),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },

    // Rail wrappers
    railsWrapper: {
        zIndex: 10,
    },
    railsLift: {
        marginTop: -scale(170),
    },
});

export default TVHomeScreen;
