/**
 * TV Series Detail Screen
 * 
 * Cinematic detail view for Series on TV.
 * Features: Season selector, Episode list, Metdata.
 * 
 * @enterprise-grade
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    Pressable,
    FlatList,
    BackHandler,
    Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import YoutubePlayer from 'react-native-youtube-iframe';
import useStore from '../../../store';
import { colors, scale, scaleFont, Icon } from '../../../theme';
import { logger } from '../../../config';
// import useTVBackHandler from '../../../utils/useTVBackHandler';
import { prefetchImage } from '../../../utils/image';
import useDownloadStore from '../../../store/downloadStore';
import downloadService from '../../../services/downloadService';

// Types


const TVSeriesDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { series } = route.params;

    // Store
    const { getXtreamAPI } = useStore();

    // State
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [focusedEpisodeId, setFocusedEpisodeId] = useState<string | null>(null);
    const [focusedSeasonId, setFocusedSeasonId] = useState<string | null>(null);
    const [hasInitialFocus, setHasInitialFocus] = useState(false);
    const [focusedButton, setFocusedButton] = useState<'play' | 'trailer' | null>(null);
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);

    // Helper to extract YouTube ID
    const getYoutubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    // ==========================================================================
    // DATA FETCHING
    // ==========================================================================

    useEffect(() => {
        let isMounted = true;

        const fetchDetails = async () => {
            try {
                const api = getXtreamAPI();
                if (!api) return;

                const data = await api.getSeriesInfo(series.series_id);
                if (isMounted) {
                    setInfo(data);

                    // Auto-select first season
                    if (data.episodes) {
                        const seasons = Object.keys(data.episodes).sort((a, b) => Number(a) - Number(b));
                        if (seasons.length > 0) {
                            setSelectedSeason(seasons[0]);
                        }
                    }
                }
            } catch (err) {
                logger.error('TVSeriesDetail: Failed to fetch info', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDetails();

        return () => {
            isMounted = false;
        };
    }, [series.series_id, getXtreamAPI]);

    // ==========================================================================
    // DATA PROCESSING
    // ==========================================================================

    const seasons = useMemo(() => {
        if (!info?.episodes) return [];
        return Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b));
    }, [info]);

    const episodes = useMemo(() => {
        if (!selectedSeason || !info?.episodes) return [];
        const raw = info.episodes[selectedSeason];
        return Array.isArray(raw) ? raw : Object.values(raw);
    }, [selectedSeason, info]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                navigation.goBack();
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [navigation])
    );

    const handlePlayEpisode = (episode: any) => {
        const api = getXtreamAPI();
        if (!api) return;

        const extension = episode.container_extension || 'mp4';
        const episodeUrl = api.getSeriesEpisodeUrl(episode.id, extension);

        navigation.navigate('FullscreenPlayer', {
            type: 'series',
            item: { ...episode, name: `${series.name} - ${episode.title}` },
            episodeUrl,
        });
    };

    const seriesData = info?.info || {};
    const backdrop = seriesData.backdrop_path?.[0] || seriesData.cover || series.cover;
    const poster = seriesData.cover || series.cover;
    const name = seriesData.name || series.name;
    const plot = seriesData.plot || seriesData.description || 'No description available.';
    const rating = seriesData.rating || series.rating_5based;
    const cast = seriesData.cast;
    const director = seriesData.director;
    const genre = seriesData.genre;


    useEffect(() => {
        prefetchImage(backdrop);
        prefetchImage(poster);
    }, [backdrop, poster]);

    const renderButton = (
        id: 'play' | 'trailer',
        label: string,
        iconName: string,
        onPress: () => void,
        primary = false
    ) => {
        const isFocused = focusedButton === id;

        return (
            <Pressable
                onPress={onPress}
                onFocus={() => setFocusedButton(id)}
                onBlur={() => setFocusedButton(null)}
                style={[
                    styles.button,
                    primary ? styles.buttonPrimary : styles.buttonSecondary,
                    isFocused && styles.buttonFocused,
                    isFocused && primary && styles.buttonFocusedPrimary,
                    isFocused && !primary && styles.buttonFocusedSecondary,
                ]}
            >
                <Icon
                    name={iconName}
                    size={scale(20)}
                    color={primary ? (isFocused ? colors.background : '#FFF') : '#FFF'}
                    style={{ marginRight: scale(8) }}
                />
                <Text style={[
                    styles.buttonText,
                    primary && isFocused && { color: colors.background }
                ]}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    useEffect(() => {
        episodes.slice(0, 8).forEach((episode: any) => {
            const image = episode.info?.movie_image || series.cover;
            prefetchImage(image);
        });
    }, [episodes, series.cover]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderSeasonItem = ({ item, index }: { item: string; index: number }) => {
        const isSelected = selectedSeason === item;
        const isFocused = focusedSeasonId === item;

        return (
            <Pressable
                onPress={() => setSelectedSeason(item)}
                onFocus={() => {
                    setFocusedSeasonId(item);
                    if (!hasInitialFocus) setHasInitialFocus(true);
                }}
                onBlur={() => setFocusedSeasonId(null)}
                focusable
                hasTVPreferredFocus={index === 0 && !hasInitialFocus}
                style={[
                    styles.seasonChip,
                    isSelected && styles.seasonChipSelected,
                    isFocused && styles.seasonChipFocused,
                ]}
            >
                <Text style={[
                    styles.seasonText,
                    (isSelected || isFocused) && styles.seasonTextActive
                ]}>
                    Season {item}
                </Text>
            </Pressable>
        );
    };

    const renderEpisodeItem = ({ item }: { item: any }) => {
        const isFocused = focusedEpisodeId === String(item.id);
        const image = item.info?.movie_image || series.cover;
        const { downloads, addDownload } = useDownloadStore.getState();
        const download = downloads.find(d => d.id === String(item.id));

        const handleEpisodeDownload = () => {
            if (download?.status === 'completed' || download?.status === 'downloading') return;

            const api = getXtreamAPI();
            if (!api || !downloadService.isAvailable()) return;

            const extension = item.container_extension || 'mp4';
            const url = api.getSeriesEpisodeUrl(item.id, extension);

            addDownload({
                id: String(item.id),
                title: `${series.name} - ${item.title}`,
                thumbnail: image,
                type: 'series',
                url,
                quality: 'hd',
                data: item,
            });

            downloadService.startDownload(String(item.id), url, `${item.id}.${extension}`);
        };

        const getDownloadIcon = () => {
            if (download?.status === 'completed') return { name: 'checkCircle', color: colors.success };
            if (download?.status === 'downloading') return { name: 'arrowCounterClockwise', color: colors.primary };
            return { name: 'downloadSimple', color: '#FFF' };
        };
        const dlIcon = getDownloadIcon();

        return (
            <Pressable
                onPress={() => handlePlayEpisode(item)}
                onFocus={() => setFocusedEpisodeId(String(item.id))}
                onBlur={() => setFocusedEpisodeId(null)}
                focusable
                style={[
                    styles.episodeCard,
                    isFocused && styles.episodeCardFocused
                ]}
            >
                <Image
                    source={{ uri: image }}
                    style={styles.episodeThumb}
                    resizeMode="cover"
                />
                <View style={styles.episodeInfo}>
                    <Text style={styles.episodeNum}>Episode {item.episode_num}</Text>
                    <Text style={[
                        styles.episodeTitle,
                        isFocused && styles.episodeTitleFocused
                    ]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {item.info?.duration && (
                        <Text style={styles.episodeDuration}>{item.info.duration}</Text>
                    )}
                </View>
                <Pressable
                    onPress={handleEpisodeDownload}
                    style={styles.episodeDownloadBtn}
                >
                    <Icon name={dlIcon.name} size={scale(20)} color={dlIcon.color} />
                </Pressable>
                {isFocused && (
                    <View style={styles.playIconContainer}>
                        <Text style={styles.playIcon}>▶</Text>
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <View
            style={styles.container}
            importantForAccessibility={isTrailerOpen ? 'no-hide-descendants' : 'auto'}
        >
            {/* 1. Full Screen Backdrop */}
            <Image
                source={{ uri: backdrop }}
                style={styles.backdrop}
                resizeMode="cover"
            />

            {/* 2. Gradient Overlay (Cinema Mode) */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#000" stopOpacity="0.95" />
                            <Stop offset="0.4" stopColor="#000" stopOpacity="0.8" />
                            <Stop offset="0.7" stopColor="#000" stopOpacity="0.4" />
                            <Stop offset="1" stopColor="#000" stopOpacity="0.1" />
                        </LinearGradient>
                        <LinearGradient id="gradBottom" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#000" stopOpacity="0" />
                            <Stop offset="0.8" stopColor="#000" stopOpacity="0.8" />
                            <Stop offset="1" stopColor="#000" stopOpacity="1" />
                        </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#grad)" />
                    <Rect width="100%" height="100%" fill="url(#gradBottom)" />
                </Svg>
            </View>

            <View style={styles.contentContainer}>
                {/* Left Column: Series Info */}
                <View style={styles.leftColumn}>
                    <Image
                        source={{ uri: poster }}
                        style={styles.poster}
                        resizeMode="cover"
                    />

                    <View style={styles.infoContainer}>
                        <Text style={styles.title} numberOfLines={2}>{name}</Text>

                        {/* Metadata Row */}
                        <View style={styles.metaRow}>
                            {rating && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>★ {rating}</Text>
                                </View>
                            )}
                            <Text style={styles.metaText}>{seasons.length} Seasons</Text>
                            {genre && (
                                <>
                                    <View style={styles.metaDivider} />
                                    <Text style={styles.metaText}>{genre}</Text>
                                </>
                            )}
                        </View>

                        {/* Credits Row */}
                        <View style={styles.creditsSection}>
                            {director && (
                                <Text style={styles.creditText}>
                                    <Text style={styles.creditLabel}>Director: </Text>
                                    {director}
                                </Text>
                            )}
                            {cast && (
                                <Text style={styles.creditText} numberOfLines={2}>
                                    <Text style={styles.creditLabel}>Cast: </Text>
                                    {cast}
                                </Text>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsContainer}>
                            {renderButton(
                                'play',
                                'Watch Now',
                                'playCircle',
                                () => {
                                    if (episodes.length > 0) handlePlayEpisode(episodes[0]);
                                },
                                true
                            )}
                            {seriesData.youtube_trailer && renderButton(
                                'trailer',
                                'Trailer',
                                'filmStrip',
                                () => setIsTrailerOpen(true),
                                false
                            )}
                        </View>

                        <Text style={styles.plot} numberOfLines={5}>{plot}</Text>
                    </View>
                </View>

                {/* Right Column: Seasons & Episodes */}
                <View style={styles.rightColumn}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <>
                            {/* Seasons List */}
                            <View style={styles.seasonsContainer}>
                                <FlatList
                                    data={seasons}
                                    renderItem={renderSeasonItem}
                                    keyExtractor={(item) => item}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.seasonsList}
                                />
                            </View>

                            {/* Episodes List */}
                            <View style={styles.episodesContainer}>
                                <FlatList
                                    data={episodes}
                                    renderItem={renderEpisodeItem}
                                    keyExtractor={(item) => String(item.id)}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.episodesList}
                                />
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* YouTube Trailer Modal */}
            <Modal
                visible={isTrailerOpen && !!seriesData.youtube_trailer}
                transparent
                animationType="fade"
                onRequestClose={() => setIsTrailerOpen(false)}
                onShow={() => setIsTrailerPlaying(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{name} - Trailer</Text>
                            <Pressable
                                onPress={() => setIsTrailerOpen(false)}
                                style={({ pressed }) => [
                                    styles.closeButton,
                                    pressed && { transform: [{ scale: 0.95 }] }
                                ]}
                                hasTVPreferredFocus
                            >
                                <Icon name="close" size={scale(24)} color="#FFF" />
                            </Pressable>
                        </View>
                        <View style={styles.youtubeContainer}>
                            <YoutubePlayer
                                height={scale(450)}
                                width={scale(800)}
                                play={isTrailerPlaying}
                                videoId={getYoutubeId(seriesData.youtube_trailer)}
                                onReady={() => setIsTrailerPlaying(true)}
                                initialPlayerParams={{
                                    autoplay: 1,
                                    modestbranding: 1,
                                    rel: 0,
                                    controls: 1,
                                }}
                                onError={(e: any) => logger.error('Youtube Player Error', e)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        padding: scale(40),
        zIndex: 10,
    },
    leftColumn: {
        width: scale(380),
        marginRight: scale(40),
        justifyContent: 'center',
    },
    rightColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    poster: {
        width: scale(220),
        aspectRatio: 2 / 3,
        borderRadius: scale(12),
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: scale(24),
        alignSelf: 'flex-start',
    },
    infoContainer: {
        flex: 1,
    },
    title: {
        fontSize: scaleFont(42),
        fontWeight: '900',
        color: '#FFF',
        marginBottom: scale(16),
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    badge: {
        backgroundColor: colors.accent || '#00E5FF',
        paddingHorizontal: scale(10),
        paddingVertical: scale(4),
        borderRadius: scale(4),
        marginRight: scale(12),
    },
    badgeText: {
        color: '#000',
        fontWeight: '900',
        fontSize: scaleFont(14),
    },
    metaText: {
        color: '#E0E0E0',
        fontSize: scaleFont(16),
        fontWeight: '600',
    },
    metaDivider: {
        width: 1,
        height: scale(14),
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: scale(16),
    },
    creditsSection: {
        marginBottom: scale(24),
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: scale(16),
    },
    creditText: {
        fontSize: scaleFont(14),
        color: '#FFF',
        marginBottom: scale(4),
        lineHeight: scaleFont(20),
    },
    creditLabel: {
        opacity: 0.6,
        fontWeight: '600',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(24),
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(12),
        paddingHorizontal: scale(24),
        borderRadius: scale(8),
        marginRight: scale(16),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonPrimary: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    buttonSecondary: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    buttonFocused: {
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
    },
    buttonText: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    plot: {
        color: '#BBB',
        fontSize: scaleFont(15),
        lineHeight: scaleFont(22),
        opacity: 0.9,
    },
    // Seasons
    seasonsContainer: {
        marginBottom: scale(24),
    },
    seasonsList: {
        paddingVertical: scale(5),
    },
    seasonChip: {
        paddingHorizontal: scale(24),
        paddingVertical: scale(12),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(20),
        marginRight: scale(12),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    seasonChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    seasonChipFocused: {
        backgroundColor: colors.accent || '#00E5FF',
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
    },
    seasonText: {
        color: '#AAA',
        fontWeight: 'bold',
        fontSize: scaleFont(16),
    },
    seasonTextActive: {
        color: '#FFF',
    },
    // Episodes
    episodesContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: scale(12),
        padding: scale(10),
    },
    episodesList: {
        paddingBottom: scale(20),
    },
    episodeCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: scale(10),
        marginBottom: scale(12),
        height: scale(90),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    episodeCardFocused: {
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'rgba(255,255,255,0.1)',
        transform: [{ scale: 1.02 }],
    },
    episodeThumb: {
        width: scale(160),
        height: '100%',
        marginRight: scale(20),
    },
    episodeInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: scale(20),
    },
    episodeNum: {
        color: colors.accent || '#00E5FF',
        fontSize: scaleFont(12),
        fontWeight: '900',
        marginBottom: scale(4),
        textTransform: 'uppercase',
    },
    episodeTitle: {
        color: '#FFF',
        fontSize: scaleFont(18),
        fontWeight: '700',
        marginBottom: scale(4),
    },
    episodeTitleFocused: {
        color: colors.accent || '#00E5FF',
    },
    episodeDuration: {
        color: '#888',
        fontSize: scaleFont(13),
        fontWeight: '600',
    },
    episodeDownloadBtn: {
        padding: scale(10),
        marginRight: scale(10),
    },
    playIconContainer: {
        marginRight: scale(24),
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: colors.accent || '#00E5FF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    playIcon: {
        color: '#000',
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        marginLeft: scale(2),
    },
    // Modal
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        padding: scale(30),
        borderRadius: scale(16),
        width: scale(860),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    modalTitle: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: '#FFF',
    },
    closeButton: {
        padding: scale(10),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(24),
    },
    youtubeContainer: {
        borderRadius: scale(12),
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    buttonFocusedPrimary: {
        backgroundColor: '#FFF',
    },
    buttonFocusedSecondary: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    }
});

export default TVSeriesDetailScreen;
