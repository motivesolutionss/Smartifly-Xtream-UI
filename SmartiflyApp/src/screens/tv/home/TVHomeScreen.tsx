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

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    BackHandler,
    ScrollView,
    StatusBar,
    Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../../../store';
import { colors, scale } from '../../../theme';
import TVSidebar, { SidebarRoute } from './components/TVSidebar';
import TVHeroBanner from './components/TVHeroBanner';
import TVContentRail from './components/TVContentRail';
import TVContinueRail from './components/TVContinueRail';
import { TVContentItem } from './components/TVContentCard';
import { WatchProgress } from '../../../store/watchHistoryStore';

// Netflix-grade resolver
import { useHomeRails } from './hooks/useHomeRails';

// Content Screens (Rendered internally as Sections)
import TVLiveScreen from '../TVLiveScreen';
import TVMoviesScreen from '../TVMoviesScreen';
import TVSeriesScreen from '../TVSeriesScreen';
import TVAnnouncementsScreen from '../TVAnnouncementsScreen';
import TVSearchScreen from './TVSearchScreen';
import TVSettingsScreen from '../TVSettingsScreen';

// =============================================================================
// TYPES
// =============================================================================

interface TVHomeScreenProps {
    navigation: any;
}

// =============================================================================
// TV HOME SCREEN COMPONENT
// =============================================================================

const TVHomeScreen: React.FC<TVHomeScreenProps> = ({ navigation }) => {
    // =========================================================================
    // STATE
    // =========================================================================
    const [activeRoute, setActiveRoute] = useState<SidebarRoute>('Home');
    const [heroDetails, setHeroDetails] = useState<any>(null);

    // Refs for explicit navigation
    const searchRef = useRef<View>(null);

    // =========================================================================
    // RESOLVER - Single source of truth for home content
    // =========================================================================
    const { rails, continueWatching, hero, isLoading } = useHomeRails();
    const { getXtreamAPI } = useStore();

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
    }, [hero?.id, getXtreamAPI]);

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

    const handleNavigate = (route: SidebarRoute) => {
        setActiveRoute(route);
        // We now switch sections internally instead of navigating away
    };

    const handleContentPress = (item: TVContentItem | any) => {
        console.log('[TVHome] Content pressed:', item.title, item.type);

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
    };

    const handleContinuePress = (item: WatchProgress) => {
        console.log('[TVHome] Continue watching pressed:', item.title, item.type);
        if (item.type === 'movie') {
            navigation.navigate('FullscreenPlayer', {
                type: 'movie',
                item: item.data || {
                    stream_id: item.streamId,
                    name: item.title,
                    stream_icon: item.thumbnail
                }
            });
        } else if (item.type === 'series') {
            navigation.navigate('FullscreenPlayer', {
                type: 'series',
                item: item.data || {
                    id: item.streamId,
                    title: item.episodeTitle || item.title,
                }
            });
        }
    };

    const handleHeroPlay = () => {
        if (hero) {
            console.log('[TVHome] Play hero:', hero.title);
            handleContentPress(hero);
        }
    };

    const handleHeroInfo = () => {
        if (hero) {
            handleContentPress(hero);
        }
    };

    // =========================================================================
    // SECTION RENDERERS
    // =========================================================================

    const renderHomeSection = () => (
        <ScrollView
            style={[
                styles.scrollView,
                // Apply margin to avoid overlap with absolute sidebar
                { marginLeft: scale(95) }
            ]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Hero Banner */}
            {hero && (
                <TVHeroBanner
                    item={{
                        ...hero,
                        ...heroDetails,
                        backdrop: heroDetails?.backdrop || hero.backdrop,
                    }}
                    onPlay={handleHeroPlay}
                    onInfo={handleHeroInfo}
                    sidebarTargetRef={searchRef}
                />
            )}

            <View style={styles.railsContainer}>
                {/* Continue Watching Rail */}
                {continueWatching.length > 0 && (
                    <TVContinueRail
                        title="Continue Watching"
                        data={continueWatching}
                        onPressItem={handleContinuePress}
                    />
                )}

                {/* Dynamic Content Rails */}
                {rails.map((rail) => (
                    <TVContentRail
                        key={rail.id}
                        title={rail.title}
                        data={rail.items}
                        onPressItem={handleContentPress}
                    />
                ))}
            </View>
        </ScrollView>
    );

    const renderContent = () => {
        const contentStyle = {
            flex: 1,
            // All content sections need to respect the sidebar space
            marginLeft: scale(95)
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
                    <View style={[contentStyle, styles.placeholderContainer]}>
                        <Text style={styles.placeholderText}>Favorites Coming Soon</Text>
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

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />

            {/* Sidebar Overlay (Fixed Position) */}
            <View style={[styles.sidebarWrapper, { width: scale(95) }]}>
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
            <View style={styles.contentContainer}>
                {renderContent()}
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
        zIndex: 100, // Stays above content
    },
    contentContainer: {
        flex: 1,
        height: '100%',
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: scale(50),
    },
    railsContainer: {
        marginTop: -scale(60), // Pull up over hero banner gradient
        zIndex: 10,
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#FFF',
        fontSize: scale(20),
    }
});

export default TVHomeScreen;
