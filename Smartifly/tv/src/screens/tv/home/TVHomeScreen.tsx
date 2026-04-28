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
    View,
    Text,
    StyleSheet,
    BackHandler,
    StatusBar,
    findNodeHandle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';

import useStore from '../../../store';
import { colors, scale, scaleFont } from '../../../theme';

import TVSidebar, { SidebarRoute } from './components/TVSidebar';
import TVHeroBanner, { TVHeroItem } from './components/TVHeroBanner';
import TVContentRail from './components/TVContentRail';
import TVContinueRail from './components/TVContinueRail';
import { TVContentItem } from './components/TVContentCard';

import useWatchHistoryStore, { WatchProgress } from '../../../store/watchHistoryStore';

import TVLiveScreen from '../TVLiveScreen';
import TVMoviesScreen from '../TVMoviesScreen';
import TVSeriesScreen from '../TVSeriesScreen';
import TVSearchScreen from './TVSearchScreen';
import TVAnnouncementsScreen from '../TVAnnouncementsScreen';
import TVSettingsScreen from '../TVSettingsScreen';
import TVFavoritesScreen from './TVFavoritesScreen';
import TVDownloadsScreen from '../TVDownloadsScreen';

import TVLoadingState from '../components/TVLoadingState';
import { prefetchImages } from '../../../utils/image';
import { FALLBACK_POSTER } from './HomeRailConfig';
import { usePerfProfile } from '../../../utils/perf';

// Netflix-grade resolver
import { useHomeRails } from './hooks/useHomeRails';
import { TVHomeScreenProps, MovieItem, SeriesItem } from '../../../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

interface HeroDetails {
    description?: string;
    rating?: number;
    backdrop?: string;
    tags?: string[];
    year?: string;
}

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
        rail: { id: string; title: string; items: TVContentItem[] };
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
const RAIL_SECTION_ESTIMATE = scale(340);

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
    heroPlayRef?: React.Ref<View>;
    activeRoute: SidebarRoute;
    isInteracted: boolean;
};

const HomeSection: React.FC<HomeSectionProps> = React.memo(({ navigation, searchRef, heroPlayRef, activeRoute, isInteracted }) => {
    const { rails, continueWatching, hero, isLoading } = useHomeRails();
    const perf = usePerfProfile();
    const prefetchRailsLimit = perf.tier === 'low' ? 2 : perf.tier === 'high' ? 5 : 4;
    const prefetchItemsPerRail = perf.tier === 'low' ? 4 : perf.tier === 'high' ? 8 : 6;
    const drawDistance = perf.home.drawDistance || HOME_DRAW_DISTANCE;

    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const removeFromHistory = useWatchHistoryStore((state) => state.removeFromHistory);

    const [heroDetails, setHeroDetails] = useState<HeroDetails | null>(null);
    const [heroDetailsStatus, setHeroDetailsStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
    const [stableHero, setStableHero] = useState<TVHeroItem | null>(null);
    const heroDetailsCache = useRef<Record<string, HeroDetails>>({});
    const heroDetailsKeyRef = useRef<string>('');
    const stableHeroIdRef = useRef<string>('');
    const prefetchedImages = useRef<Set<string>>(new Set());
    const heroId = hero ? String(hero.id) : '';
    const heroType = hero?.type;
    const heroMovieId = heroType === 'movie' ? hero?.data?.stream_id : undefined;
    const heroSeriesId = heroType === 'series' ? hero?.data?.series_id : undefined;

    // =========================================================================
    // HERO DETAILS FETCH (Home only)
    // =========================================================================
    useEffect(() => {
        let isMounted = true;

        if (!heroId || !heroType) {
            setHeroDetails(null);
            setHeroDetailsStatus('idle');
            heroDetailsKeyRef.current = '';
            return () => {
                isMounted = false;
            };
        }

        heroDetailsKeyRef.current = heroId;

        const cached = heroDetailsCache.current[heroId];
        if (cached) {
            setHeroDetails(cached);
            setHeroDetailsStatus('ready');
            return () => {
                isMounted = false;
            };
        }

        setHeroDetails(null);
        setHeroDetailsStatus('loading');

        const fetchHeroDetails = async () => {
            try {
                const api = getXtreamAPI?.();
                if (!api) throw new Error('API unavailable');

                let details: HeroDetails = {};

                if (heroType === 'movie') {
                    if (!heroMovieId) throw new Error('Missing movie id');
                    const info = await api.getVodInfo(heroMovieId);
                    if (info?.info) {
                        details = {
                            description: info.info.plot,
                            rating: info.info.rating,
                            backdrop: info.info.backdrop_path?.[0],
                            tags: info.info.genre
                                ? info.info.genre.split(',').map((g: string) => g.trim())
                                : [],
                            year: info.info.releasedate ? info.info.releasedate.split('-')[0] : '',
                        };
                    }
                } else if (heroType === 'series') {
                    if (!heroSeriesId) throw new Error('Missing series id');
                    const info = await api.getSeriesInfo(heroSeriesId);
                    if (info?.info) {
                        details = {
                            description: info.info.plot,
                            rating: info.info.rating,
                            backdrop: info.info.backdrop_path?.[0],
                            tags: info.info.genre
                                ? info.info.genre.split(',').map((g: string) => g.trim())
                                : [],
                            year: info.info.releaseDate ? info.info.releaseDate.split('-')[0] : '',
                        };
                    }
                }

                if (isMounted && heroDetailsKeyRef.current === heroId) {
                    heroDetailsCache.current[heroId] = details;
                    setHeroDetails(details);
                    setHeroDetailsStatus('ready');
                }
            } catch (err) {
                console.warn('[TVHome] Error fetching hero details:', err);
                if (isMounted && heroDetailsKeyRef.current === heroId) {
                    heroDetailsCache.current[heroId] = {};
                    setHeroDetails({});
                    setHeroDetailsStatus('ready');
                }
            }
        };

        fetchHeroDetails();

        return () => {
            isMounted = false;
        };
    }, [heroId, heroType, heroMovieId, heroSeriesId, getXtreamAPI]);

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

        const details = heroDetails ?? {};
        const resolvedBackdrop = isUsableUri(hero.backdrop)
                ? hero.backdrop
                : isUsableUri(details.backdrop)
                    ? String(details.backdrop)
                : FALLBACK_POSTER;

        return {
            ...hero,
            ...details,
            description: details.description || hero.description,
            rating: details.rating ?? hero.rating,
            tags: details.tags?.length ? details.tags : hero.tags,
            year: details.year,
            backdrop: resolvedBackdrop,
        };
    }, [hero, heroDetails]);

    useEffect(() => {
        if (!heroItem) return;

        const nextId = String(heroItem.id);
        const shouldPromote =
            !stableHero ||
            stableHeroIdRef.current !== nextId ||
            heroDetailsStatus === 'ready';

        if (!shouldPromote) return;

        stableHeroIdRef.current = nextId;
        setStableHero(heroItem);
    }, [heroItem, heroDetailsStatus, stableHero]);

    const heroSlotItem = stableHero ?? heroItem;

    // =========================================================================
    // PREFETCH (Home only, staged so first interaction wins)
    // =========================================================================
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

        for (const item of continueWatching.slice(0, prefetchItemsPerRail)) {
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
        continueWatching,
        rails,
        prefetchItemsPerRail,
        prefetchRailsLimit,
        perf.tier,
        isInteracted,
    ]);

    const homeSections = useMemo<HomeSection[]>(() => {
        const sections: HomeSection[] = [];

        let liftNext = true;

        if (continueWatching.length > 0) {
            sections.push({
                key: 'continue',
                type: 'continue',
                data: continueWatching,
                lift: liftNext,
            });
            liftNext = false;
        }

        for (const rail of rails) {
            sections.push({
                key: `rail-${rail.id}`,
                type: 'rail',
                rail: {
                    id: rail.id,
                    title: rail.title,
                    items: rail.items as TVContentItem[],
                },
                lift: liftNext,
            });
            liftNext = false;
        }

        return sections;
    }, [continueWatching, rails]);

    const getItemType = useCallback((item: HomeSection) => item.type, []);
    const overrideItemLayout = useCallback(
        (layout: { size?: number; span?: number }, item: HomeSection) => {
            switch (item.type) {
                case 'continue':
                case 'rail':
                default:
                    layout.size = RAIL_SECTION_ESTIMATE;
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
                            />
                        </View>
                    );

                default:
                    return null;
            }
        },
        [handleContinuePress, handleContentPress, removeFromHistory]
    );

    // ✅ While loading: render ONLY placeholder (avoid heavy list underneath)
    if (isLoading) {
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
                data={homeSections}
                renderItem={renderHomeItem}
                keyExtractor={(item) => item.key}
                ListHeaderComponent={renderHeroHeader}
                // @ts-ignore
                estimatedItemSize={RAIL_SECTION_ESTIMATE}
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
    const [mountedRoutes, setMountedRoutes] = useState<Record<string, boolean>>({
        Home: true,
    });
    const searchRef = useRef<View | null>(null);
    const perf = usePerfProfile();
    const keepVisitedMounted = perf.tier !== 'low';

    useEffect(() => {
        if (!keepVisitedMounted) return;
        setMountedRoutes(prev => (prev[activeRoute] ? prev : { ...prev, [activeRoute]: true }));
    }, [activeRoute, keepVisitedMounted]);

    const updateFocusTarget = useCallback((route: string, node: View | null) => {
        if (!node) {
            setFocusTargets((prev) => (prev[route] ? { ...prev, [route]: undefined } : prev));
            return;
        }

        const handle = findNodeHandle(node);
        if (handle) {
            setFocusTargets(prev => ({ ...prev, [route]: handle }));
            // Any content focus means we've interacted with the screen
            setIsInteracted(true);
        }
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

    const renderPinnedSection = useCallback(
        (route: SidebarRoute, node: React.ReactNode, withSidebarGap = true) => {
            if (!mountedRoutes[route]) return null;
            const isActive = activeRoute === route;
            return (
                <View
                    pointerEvents={isActive ? 'auto' : 'none'}
                    accessibilityElementsHidden={!isActive}
                    importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
                    style={[
                        styles.sectionBase,
                        withSidebarGap && styles.sectionWithSidebar,
                        isActive ? styles.sectionVisible : styles.sectionHidden,
                    ]}
                >
                    {node}
                </View>
            );
        },
        [activeRoute, mountedRoutes]
    );

    const renderActiveSection = useCallback(
        (route: SidebarRoute, node: React.ReactNode, withSidebarGap = true) => {
            if (activeRoute !== route) return null;
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
        },
        [activeRoute]
    );

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
                    // @ts-ignore - Prop exists in TVSidebar but TS server sometimes fails to resolve it after interface updates
                    focusTargets={focusTargets}
                />
            </View>

            {/* Main Content Area */}
            <View style={styles.contentContainer}>
                {keepVisitedMounted
                    ? renderPinnedSection(
                        'Home',
                        <HomeSection
                            navigation={navigation}
                            searchRef={searchRef}
                            heroPlayRef={homeFocusRef}
                            activeRoute={activeRoute}
                            isInteracted={isInteracted}
                        />,
                        false
                    )
                    : renderActiveSection(
                        'Home',
                        <HomeSection
                            navigation={navigation}
                            searchRef={searchRef}
                            heroPlayRef={homeFocusRef}
                            activeRoute={activeRoute}
                            isInteracted={isInteracted}
                        />,
                        false
                    )}
                {keepVisitedMounted
                    ? renderPinnedSection('Live', <TVLiveScreen navigation={navigation} focusEntryRef={liveFocusRef} />)
                    : renderActiveSection('Live', <TVLiveScreen navigation={navigation} focusEntryRef={liveFocusRef} />)}
                {keepVisitedMounted
                    ? renderPinnedSection('Movies', <TVMoviesScreen navigation={navigation} focusEntryRef={moviesFocusRef} />)
                    : renderActiveSection('Movies', <TVMoviesScreen navigation={navigation} focusEntryRef={moviesFocusRef} />)}
                {keepVisitedMounted
                    ? renderPinnedSection('Series', <TVSeriesScreen navigation={navigation} focusEntryRef={seriesFocusRef} />)
                    : renderActiveSection('Series', <TVSeriesScreen navigation={navigation} focusEntryRef={seriesFocusRef} />)}

                {renderActiveSection('Announcements', <TVAnnouncementsScreen navigation={navigation} focusEntryRef={announcementsFocusRef} />)}
                {renderActiveSection('Search', <TVSearchScreen navigation={navigation} focusEntryRef={searchFocusRef} />)}
                {renderActiveSection('Favorites', <TVFavoritesScreen navigation={navigation} focusEntryRef={favoritesFocusRef} />)}
                {renderActiveSection('Downloads', <TVDownloadsScreen navigation={navigation} focusEntryRef={downloadsFocusRef} />)}
                {renderActiveSection('Settings', <TVSettingsScreen navigation={navigation} focusEntryRef={settingsFocusRef} />)}
            </View>
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
        marginTop: -scale(132),
    },
});

export default TVHomeScreen;
