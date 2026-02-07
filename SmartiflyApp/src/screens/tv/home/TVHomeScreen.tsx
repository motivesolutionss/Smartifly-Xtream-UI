/**
 * Smartifly TV Home Screen - Netflix-Grade Edition
 * 
 * 100% MANIFEST-DRIVEN home screen.
 * Uses useHomeRails resolver - ZERO manual rail ordering.
 * 
 * Architecture:
 * - HomeRailConfig.ts → defines WHAT appears
 * - useHomeRails.ts → resolves config into renderable data
 * - TVHomeScreen.tsx → Switch-based Shell Architecture for Persistent Sidebar
 * 
 * Benefits:
 * - Single source of truth (config)
 * - Persistent Sidebar across main sections
 * - Smooth content switching
 * 
 * @enterprise-grade
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    BackHandler,
    StatusBar,
    Animated,
    Easing,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../../../store';
import { colors, scale, scaleFont } from '../../../theme';
import TVSidebar, { SidebarRoute } from './components/TVSidebar';
import TVHeroBanner from './components/TVHeroBanner';
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
// Netflix-grade resolver
import { useHomeRails } from './hooks/useHomeRails';
import { TVHomeScreenProps, MovieItem, SeriesItem } from '../../../navigation/types';

// Content Screens (Rendered internally as Sections)

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

// =============================================================================
// PREFETCH CONFIG
// =============================================================================

const PREFETCH_RAILS_LIMIT = 4;
const PREFETCH_ITEMS_PER_RAIL = 6;
const HOME_DRAW_DISTANCE = scale(900);
const PLACEHOLDER_RAIL_COUNT = 3;
const PLACEHOLDER_CARDS_PER_RAIL = 6;

type HomeSection =
    | {
        key: string;
        type: 'hero';
        item: any;
    }
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

const TVHomePlaceholder: React.FC = () => (
    <View style={styles.placeholderContainerInner}>
        <Text style={styles.placeholderLabel}>Loading Home...</Text>
        <TVLoadingState size="large" style={styles.placeholderSpinner} />

        <View style={styles.placeholderHero}>
            <View style={styles.placeholderHeroBackdrop} />
            <View style={styles.placeholderHeroContent}>
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

        {Array.from({ length: PLACEHOLDER_RAIL_COUNT }).map((_, index) => (
            <HomePlaceholderRail key={`placeholder-rail-${index}`} index={index} />
        ))}
    </View>
);



// =============================================================================
// TV HOME SCREEN COMPONENT
// =============================================================================

const TVHomeScreen: React.FC<TVHomeScreenProps> = ({ navigation }) => {
    // =========================================================================
    // STATE
    // =========================================================================
    const [activeRoute, setActiveRoute] = useState<SidebarRoute>('Home');
    const [heroDetails, setHeroDetails] = useState<HeroDetails | null>(null);

    // Refs for explicit navigation
    const searchRef = useRef<View>(null);

    // =========================================================================
    // RESOLVER - Single source of truth for home content
    // =========================================================================
    const { rails, continueWatching, hero, isLoading } = useHomeRails();
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const removeFromHistory = useWatchHistoryStore((state) => state.removeFromHistory);

    // Animations for section switching
    const fadeAnim = useRef(new Animated.Value(1)).current; // Start at 1 for initial skeleton visibility
    const slideAnim = useRef(new Animated.Value(0)).current; // Start at 0 for initial mount

    // Flag to skip initial animation on mount
    const isFirstMount = useRef(true);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        // Reset and animate in when route changes
        fadeAnim.setValue(0);
        slideAnim.setValue(20);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        ]).start();
    }, [activeRoute]);

    // =========================================================================
    // HERO DETAILS FETCH
    // =========================================================================
    useEffect(() => {
        let isMounted = true;
        const fetchHeroDetails = async () => {
            if (!hero || !getXtreamAPI) return;

            try {
                const api = getXtreamAPI();
                if (!api) return;

                let details: any = {};

                if (hero.type === 'movie') {
                    const info = await api.getVodInfo(hero.data.stream_id);
                    if (info?.info) {
                        details = {
                            description: info.info.plot,
                            rating: info.info.rating,
                            backdrop: info.info.backdrop_path?.[0],
                            tags: info.info.genre ? info.info.genre.split(',').map((g: string) => g.trim()) : [],
                            year: info.info.releasedate ? info.info.releasedate.split('-')[0] : '',
                        };
                    }
                } else if (hero.type === 'series') {
                    const info = await api.getSeriesInfo(hero.data.series_id);
                    if (info?.info) {
                        details = {
                            description: info.info.plot,
                            rating: info.info.rating,
                            backdrop: info.info.backdrop_path?.[0],
                            tags: info.info.genre ? info.info.genre.split(',').map((g: string) => g.trim()) : [],
                            year: info.info.releaseDate ? info.info.releaseDate.split('-')[0] : '',
                        };
                    }
                }

                if (isMounted) {
                    setHeroDetails(details);
                }
            } catch (err) {
                console.warn('[TVHome] Error fetching hero details:', err);
            }
        };

        setHeroDetails(null);
        fetchHeroDetails();

        return () => { isMounted = false; };
    }, [hero, getXtreamAPI]);

    // =========================================================================
    // BACK HANDLER
    // =========================================================================
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                // If on a sub-screen, go back to Home section
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

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleNavigate = useCallback((route: SidebarRoute) => {
        setActiveRoute(route);
        // We now switch sections internally instead of navigating away
    }, []);

    const handleContentPress = useCallback((item: TVContentItem | any) => {

        if (item.type === 'live') {
            if (item.data) {
                navigation.navigate('FullscreenPlayer', {
                    type: 'live',
                    item: item.data
                });
            }
        } else if (item.type === 'movie') {
            if (item.data) {
                navigation.navigate('TVMovieDetail', {
                    movie: item.data
                });
            }
        } else if (item.type === 'series') {
            if (item.data) {
                navigation.navigate('TVSeriesDetail', {
                    series: item.data
                });
            }
        }
    }, [navigation]);

    const handleContinuePress = useCallback((item: WatchProgress) => {
        if (item.type === 'movie') {
            // Cast to MovieItem - item.data contains the original movie data, or construct from WatchProgress
            const movieItem = (item.data as MovieItem) ?? ({
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
            // Cast to SeriesItem - item.data contains the original series data, or construct from WatchProgress
            const seriesItem = (item.data as SeriesItem) ?? ({
                series_id: item.streamId,
                name: item.episodeTitle || item.title,
            } as SeriesItem);
            navigation.navigate('FullscreenPlayer', {
                type: 'series',
                item: seriesItem,
                resumePosition: item.position,
            });
        }
    }, [navigation]);

    const handleHeroPlay = useCallback(() => {
        if (hero) {
            handleContentPress(hero);
        }
    }, [hero, handleContentPress]);

    const handleHeroInfo = useCallback(() => {
        if (hero) {
            handleContentPress(hero);
        }
    }, [hero, handleContentPress]);

    const heroItem = useMemo(() => {
        if (!hero) return null;
        return {
            ...hero,
            ...heroDetails,
            backdrop: heroDetails?.backdrop || hero.backdrop,
        };
    }, [hero, heroDetails]);

    // =========================================================================
    // PREFETCH (first visible rails)
    // =========================================================================

    useEffect(() => {
        const uris: Array<string | undefined> = [];

        if (heroItem?.backdrop) {
            uris.push(heroItem.backdrop);
        }

        if (continueWatching.length > 0) {
            for (const item of continueWatching.slice(0, PREFETCH_ITEMS_PER_RAIL)) {
                uris.push(item.thumbnail);
            }
        }

        for (const rail of rails.slice(0, PREFETCH_RAILS_LIMIT)) {
            const items = (rail.items as TVContentItem[]).slice(0, PREFETCH_ITEMS_PER_RAIL);
            for (const item of items) {
                uris.push(item.image);
            }
        }

        prefetchImages(uris);
    }, [heroItem?.backdrop, continueWatching, rails]);

    const homeSections = useMemo<HomeSection[]>(() => {
        const sections: HomeSection[] = [];

        if (heroItem) {
            sections.push({
                key: `hero-${heroItem.id}`,
                type: 'hero',
                item: heroItem,
            });
        }

        let liftNext = !!heroItem;

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
    }, [heroItem, continueWatching, rails]);

    const getItemType = useCallback((item: HomeSection) => item.type, []);

    const renderHomeItem = useCallback(({ item }: { item: HomeSection }) => {
        switch (item.type) {
            case 'hero':
                return (
                    <TVHeroBanner
                        item={item.item}
                        onPlay={handleHeroPlay}
                        onInfo={handleHeroInfo}
                        sidebarTargetRef={searchRef}
                    />
                );
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
    }, [
        handleHeroPlay,
        handleHeroInfo,
        handleContinuePress,
        handleContentPress,
        removeFromHistory,
    ]);

    // =========================================================================
    // SECTION RENDERERS
    // =========================================================================

    const renderHomeSection = () => (
        <View style={styles.homeSection}>
            <FlashList
                style={[
                    styles.scrollView,
                    // Apply margin to avoid overlap with absolute sidebar
                    { marginLeft: scale(130) }
                ]}
                contentContainerStyle={styles.scrollContent}
                data={homeSections}
                renderItem={renderHomeItem}
                keyExtractor={(item) => item.key}
                // @ts-ignore: estimatedItemSize is valid but types are missing in this version
                estimatedItemSize={scale(360)}
                getItemType={getItemType}
                drawDistance={HOME_DRAW_DISTANCE}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    const renderContent = () => {
        const contentStyle = {
            flex: 1,
            // All content sections need to respect the sidebar space
            marginLeft: scale(130)
        };

        switch (activeRoute) {
            case 'Live':
                return (
                    <View style={contentStyle}>
                        <TVLiveScreen navigation={navigation} />
                    </View>
                );
            case 'Movies':
                return (
                    <View style={contentStyle}>
                        <TVMoviesScreen navigation={navigation} />
                    </View>
                );
            case 'Series':
                return (
                    <View style={contentStyle}>
                        <TVSeriesScreen navigation={navigation} />
                    </View>
                );
            case 'Announcements':
                return (
                    <View style={contentStyle}>
                        <TVAnnouncementsScreen />
                    </View>
                );
            case 'Search':
                return (
                    <View style={contentStyle}>
                        <TVSearchScreen navigation={navigation} />
                    </View>
                );
            case 'Favorites':
                return (
                    <View style={contentStyle}>
                        <TVFavoritesScreen navigation={navigation} />
                    </View>
                );
            case 'Downloads':
                return (
                    <View style={contentStyle}>
                        <TVDownloadsScreen navigation={navigation} />
                    </View>
                );
            case 'Settings':
                return (
                    <View style={contentStyle}>
                        <TVSettingsScreen navigation={navigation} />
                    </View>
                );
            case 'Home':
            default:
                return renderHomeSection();
        }
    };

    const showHomePlaceholder = activeRoute === 'Home' && isLoading;

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />

            {/* Sidebar Overlay (Fixed Position) */}
            <View style={[styles.sidebarWrapper, { width: scale(130) }]}>
                <TVSidebar
                    activeRoute={activeRoute}
                    onNavigate={handleNavigate}
                    isExpanded={false} // Deprecated but kept for interface type safety if needed
                    onExpand={() => { }}
                    onCollapse={() => { }}
                    searchRef={searchRef}
                />
            </View>

            {/* Main Content Area */}
            <Animated.View style={[
                styles.contentContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}>
                {renderContent()}
            </Animated.View>

            {showHomePlaceholder && (
                <View
                    pointerEvents="none"
                    style={styles.placeholderOverlay}
                >
                    <TVHomePlaceholder />
                </View>
            )}
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
        zIndex: 100, // Stays above content
    },
    contentContainer: {
        flex: 1,
        height: '100%',
        backgroundColor: colors.background,
    },
    loadingState: {
        paddingVertical: scale(60),
        alignItems: 'center',
    },
    homeSection: {
        flex: 1,
    },
    placeholderOverlay: {
        position: 'absolute',
        top: 0,
        left: scale(130),
        right: 0,
        bottom: 0,
        zIndex: 2,
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
    placeholderHero: {
        width: '100%',
        height: scale(480),
        marginBottom: scale(40),
        position: 'relative',
    },
    placeholderHeroBackdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '70%',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: scale(10),
    },
    placeholderHeroContent: {
        position: 'absolute',
        left: 0,
        bottom: scale(70),
        width: '60%',
    },
    placeholderLine: {
        height: scale(14),
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
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
        backgroundColor: 'rgba(229, 9, 20, 0.4)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: scale(8),
        marginRight: scale(24),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: scale(50),
    },
    railsWrapper: {
        zIndex: 10,
    },
    railsLift: {
        marginTop: -scale(60), // Pull up over hero banner gradient
    }
});

export default TVHomeScreen;
