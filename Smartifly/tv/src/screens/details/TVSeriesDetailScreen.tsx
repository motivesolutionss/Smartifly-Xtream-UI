/**
 * TV Series Detail Screen
 *
 * Cinematic detail view for Series on TV.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Pressable,
    FlatList,
    Modal,
} from 'react-native';
import Reanimated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import FastImageComponent from '../../components/tv/TVFastImage';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import YoutubePlayer from 'react-native-youtube-iframe';
import useStore from '@smartifly/shared/src/store';
import { colors, scale, scaleFont, Icon } from '../../theme';
import { logger } from '../../config';
import useTVBackHandler from '../../utils/useTVBackHandler';
import { prefetchImage } from '@smartifly/shared/src/utils/image';
import useDownloadStore from '@smartifly/shared/src/store/downloadStore';
import downloadService from '@smartifly/shared/src/services/downloadService';

const SPRING = {
    damping: 16,
    stiffness: 220,
    mass: 0.6,
};

const FocusSeriesButton: React.FC<{
    label: string;
    iconName: string;
    onPress: () => void;
    primary?: boolean;
}> = ({ label, iconName, onPress, primary = false }) => {
    const focused = useSharedValue(0);
    const scaleValue = useSharedValue(1);

    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            [primary ? (colors.accent || '#00E5FF') : 'rgba(255,255,255,0.15)', primary ? '#FFFFFF' : 'rgba(255,255,255,0.3)']
        ),
        borderColor: interpolateColor(focused.value, [0, 1], ['transparent', '#FFFFFF']),
        transform: [{ scale: scaleValue.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            [primary ? '#111111' : '#FFFFFF', primary ? '#111111' : '#FFFFFF']
        ),
    }));

    return (
        <Reanimated.View style={[styles.button, primary ? styles.buttonPrimary : styles.buttonSecondary, shellStyle]}>
            <Pressable
                onPress={onPress}
                onFocus={() => {
                    focused.value = withTiming(1, { duration: 90 });
                    scaleValue.value = withSpring(1.05, SPRING);
                }}
                onBlur={() => {
                    focused.value = withTiming(0, { duration: 90 });
                    scaleValue.value = withSpring(1, SPRING);
                }}
                style={styles.focusButtonPressable}
            >
                <Icon name={iconName} size={scale(20)} color={primary ? '#111' : '#FFF'} style={styles.buttonIcon} />
                <Reanimated.Text style={[styles.buttonText, primary && styles.buttonTextPrimary, textStyle]}>
                    {label}
                </Reanimated.Text>
            </Pressable>
        </Reanimated.View>
    );
};

const SeasonChip: React.FC<{
    season: string;
    isSelected: boolean;
    hasTVPreferredFocus?: boolean;
    onPress: () => void;
    onInitialFocus?: () => void;
}> = ({ season, isSelected, hasTVPreferredFocus = false, onPress, onInitialFocus }) => {
    const focused = useSharedValue(0);

    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            [isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', colors.accent || '#00E5FF']
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            [isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)', '#FFFFFF']
        ),
        transform: [{ scale: focused.value > 0 ? 1.05 : 1 }],
    }), [isSelected]);

    const textStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            [isSelected ? '#FFFFFF' : '#AAAAAA', '#111111']
        ),
    }), [isSelected]);

    return (
        <Reanimated.View style={[styles.seasonChip, isSelected && styles.seasonChipSelected, shellStyle]}>
            <Pressable
                onPress={onPress}
                onFocus={() => {
                    focused.value = withTiming(1, { duration: 90 });
                    onInitialFocus?.();
                }}
                onBlur={() => {
                    focused.value = withTiming(0, { duration: 90 });
                }}
                hasTVPreferredFocus={hasTVPreferredFocus}
                style={styles.seasonPressable}
            >
                <Reanimated.Text style={[styles.seasonText, isSelected && styles.seasonTextActive, textStyle]}>
                    Season {season}
                </Reanimated.Text>
            </Pressable>
        </Reanimated.View>
    );
};

const EpisodeCard: React.FC<{
    item: any;
    image: string;
    dlIcon: { name: string; color: string | undefined };
    onPress: () => void;
    onDownloadPress: () => void;
}> = ({ item, image, dlIcon, onPress, onDownloadPress }) => {
    const focused = useSharedValue(0);

    const shellStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(focused.value, [0, 1], ['transparent', colors.accent || '#00E5FF']),
        backgroundColor: interpolateColor(focused.value, [0, 1], ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.1)']),
        transform: [{ scale: focused.value > 0 ? 1.02 : 1 }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        color: interpolateColor(focused.value, [0, 1], ['#FFFFFF', colors.accent || '#00E5FF']),
    }));

    const playOpacity = useAnimatedStyle(() => ({
        opacity: focused.value,
    }));

    return (
        <Reanimated.View style={[styles.episodeCard, shellStyle]}>
            <Pressable
                onPress={onPress}
                onFocus={() => {
                    focused.value = withTiming(1, { duration: 90 });
                }}
                onBlur={() => {
                    focused.value = withTiming(0, { duration: 90 });
                }}
                style={styles.episodePressable}
            >
                <FastImageComponent
                    source={{ uri: image }}
                    style={styles.episodeThumb}
                    resizeMode="cover"
                />
                <View style={styles.episodeInfo}>
                    <Text style={styles.episodeNum}>Episode {item.episode_num}</Text>
                    <Reanimated.Text style={[styles.episodeTitle, titleStyle]} numberOfLines={1}>
                        {item.title}
                    </Reanimated.Text>
                    {item.info?.duration ? (
                        <Text style={styles.episodeDuration}>{item.info.duration}</Text>
                    ) : null}
                </View>
                <Pressable onPress={onDownloadPress} style={styles.episodeDownloadBtn}>
                    <Icon name={dlIcon.name} size={scale(20)} color={dlIcon.color} />
                </Pressable>
                <Reanimated.View style={[styles.playIconContainer, playOpacity]}>
                    <Text style={styles.playIcon}>▶</Text>
                </Reanimated.View>
            </Pressable>
        </Reanimated.View>
    );
};

const TVSeriesDetailScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { series } = route.params;

    const getXtreamAPI = useStore((state) => state.getXtreamAPI);
    const downloads = useDownloadStore((state) => state.downloads);
    const addDownload = useDownloadStore((state) => state.addDownload);

    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [hasInitialFocus, setHasInitialFocus] = useState(false);
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);

    const getYoutubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    useEffect(() => {
        let isMounted = true;

        const fetchDetails = async () => {
            try {
                const api = getXtreamAPI();
                if (!api) return;

                const data = await api.getSeriesInfo(series.series_id);
                if (isMounted) {
                    setInfo(data);
                    if (data.episodes) {
                        const seasonKeys = Object.keys(data.episodes).sort((a, b) => Number(a) - Number(b));
                        if (seasonKeys.length > 0) {
                            setSelectedSeason(seasonKeys[0]);
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

    const seasons = useMemo(() => {
        if (!info?.episodes) return [];
        return Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b));
    }, [info]);

    const episodes = useMemo(() => {
        if (!selectedSeason || !info?.episodes) return [];
        const raw = info.episodes[selectedSeason];
        return Array.isArray(raw) ? raw : Object.values(raw);
    }, [selectedSeason, info]);

    useTVBackHandler(
        useCallback(() => {
            if (isTrailerOpen) {
                setIsTrailerOpen(false);
                return true;
            }
            navigation.goBack();
            return true;
        }, [isTrailerOpen, navigation])
    );

    const handlePlayEpisode = useCallback((episode: any) => {
        const api = getXtreamAPI();
        if (!api) return;

        const extension = episode.container_extension || 'mp4';
        const episodeUrl = api.getSeriesEpisodeUrl(episode.id, extension);

        navigation.navigate('FullscreenPlayer', {
            type: 'series',
            item: { ...episode, name: `${series.name} - ${episode.title}` },
            episodeUrl,
        });
    }, [getXtreamAPI, navigation, series.name]);

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

    useEffect(() => {
        episodes.slice(0, 8).forEach((episode: any) => {
            const image = episode.info?.movie_image || series.cover;
            prefetchImage(image);
        });
    }, [episodes, series.cover]);

    const renderSeasonItem = useCallback(({ item, index }: { item: string; index: number }) => (
        <SeasonChip
            season={item}
            isSelected={selectedSeason === item}
            hasTVPreferredFocus={index === 0 && !hasInitialFocus}
            onPress={() => setSelectedSeason(item)}
            onInitialFocus={() => {
                if (!hasInitialFocus) setHasInitialFocus(true);
            }}
        />
    ), [hasInitialFocus, selectedSeason]);

    const renderEpisodeItem = useCallback(({ item }: { item: any }) => {
        const image = item.info?.movie_image || series.cover;
        const download = downloads.find((d) => d.id === String(item.id));

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

        const dlIcon =
            download?.status === 'completed'
                ? { name: 'checkCircle', color: colors.success }
                : download?.status === 'downloading'
                ? { name: 'arrowCounterClockwise', color: colors.primary }
                : { name: 'downloadSimple', color: '#FFF' };

        return (
            <EpisodeCard
                item={item}
                image={image}
                dlIcon={dlIcon}
                onPress={() => handlePlayEpisode(item)}
                onDownloadPress={handleEpisodeDownload}
            />
        );
    }, [addDownload, downloads, getXtreamAPI, handlePlayEpisode, series.cover, series.name]);

    return (
        <View
            style={styles.container}
            importantForAccessibility={isTrailerOpen ? 'no-hide-descendants' : 'auto'}
        >
            <FastImageComponent
                source={{ uri: backdrop }}
                style={styles.backdrop}
                resizeMode="cover"
                priority="high"
            />

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
                <View style={styles.leftColumn}>
                    <FastImageComponent
                        source={{ uri: poster }}
                        style={styles.poster}
                        resizeMode="cover"
                        priority="high"
                    />

                    <View style={styles.infoContainer}>
                        <Text style={styles.title} numberOfLines={2}>{name}</Text>

                        <View style={styles.metaRow}>
                            {rating ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>★ {rating}</Text>
                                </View>
                            ) : null}
                            <Text style={styles.metaText}>{seasons.length} Seasons</Text>
                        </View>

                        {genre ? <Text style={styles.genreText} numberOfLines={2}>{genre}</Text> : null}

                        <View style={styles.creditsSection}>
                            {director ? (
                                <Text style={styles.creditText}>
                                    <Text style={styles.creditLabel}>Director: </Text>
                                    {director}
                                </Text>
                            ) : null}
                            {cast ? (
                                <Text style={styles.creditText} numberOfLines={2}>
                                    <Text style={styles.creditLabel}>Cast: </Text>
                                    {cast}
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.actionsContainer}>
                            <FocusSeriesButton
                                label="Watch Now"
                                iconName="playCircle"
                                onPress={() => {
                                    if (episodes.length > 0) handlePlayEpisode(episodes[0]);
                                }}
                                primary
                            />
                            {seriesData.youtube_trailer ? (
                                <FocusSeriesButton
                                    label="Trailer"
                                    iconName="filmStrip"
                                    onPress={() => setIsTrailerOpen(true)}
                                />
                            ) : null}
                        </View>

                        <Text style={styles.plot} numberOfLines={5}>{plot}</Text>
                    </View>
                </View>

                <View style={styles.rightColumn}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <>
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
                                    pressed && styles.closeButtonPressed
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
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        padding: scale(40),
        zIndex: 10,
    },
    leftColumn: {
        width: scale(460),
        marginRight: scale(40),
        justifyContent: 'center',
    },
    rightColumn: {
        flex: 0,
        width: '72%',
        maxWidth: scale(1500),
        marginLeft: 'auto',
        marginTop: scale(24),
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
        fontSize: scaleFont(16),
    },
    metaText: {
        color: '#E0E0E0',
        fontSize: scaleFont(22),
        fontWeight: '600',
    },
    genreText: {
        color: '#E0E0E0',
        fontSize: scaleFont(22),
        fontWeight: '600',
        marginTop: scale(4),
        marginBottom: scale(6),
    },
    creditsSection: {
        marginBottom: scale(24),
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: scale(16),
    },
    creditText: {
        fontSize: scaleFont(20),
        color: '#FFF',
        marginBottom: scale(4),
        lineHeight: scaleFont(30),
    },
    creditLabel: {
        opacity: 0.6,
        fontWeight: '600',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(24),
        gap: scale(12),
    },
    button: {
        minWidth: scale(210),
        borderRadius: scale(8),
        borderWidth: 2,
        borderColor: 'transparent',
        flexShrink: 0,
    },
    focusButtonPressable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(18),
        paddingHorizontal: scale(20),
        minWidth: scale(210),
        borderRadius: scale(8),
    },
    buttonPrimary: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    buttonSecondary: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    buttonText: {
        fontSize: scaleFont(24),
        fontWeight: '700',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    buttonTextPrimary: {
        color: '#111',
    },
    buttonIcon: {
        marginRight: scale(8),
    },
    plot: {
        color: '#BBB',
        fontSize: scaleFont(24),
        lineHeight: scaleFont(35),
        opacity: 0.9,
    },
    seasonsContainer: {
        marginBottom: scale(24),
    },
    seasonsList: {
        paddingVertical: scale(5),
    },
    seasonChip: {
        borderRadius: scale(20),
        marginRight: scale(12),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    seasonChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: 'rgba(255,255,255,0.3)',
    },
    seasonPressable: {
        paddingHorizontal: scale(24),
        paddingVertical: scale(12),
    },
    seasonText: {
        color: '#AAA',
        fontWeight: 'bold',
        fontSize: scaleFont(16),
    },
    seasonTextActive: {
        color: '#FFF',
    },
    episodesContainer: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: scale(12),
        padding: scale(10),
    },
    episodesList: {
        paddingBottom: scale(20),
    },
    episodeCard: {
        borderRadius: scale(10),
        marginBottom: scale(12),
        height: scale(108),
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    episodePressable: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    episodeThumb: {
        width: scale(190),
        height: '100%',
        marginRight: scale(22),
    },
    episodeInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: scale(20),
    },
    episodeNum: {
        color: colors.accent || '#00E5FF',
        fontSize: scaleFont(15),
        fontWeight: '900',
        marginBottom: scale(4),
        textTransform: 'uppercase',
    },
    episodeTitle: {
        color: '#FFF',
        fontSize: scaleFont(22),
        fontWeight: '700',
        marginBottom: scale(4),
    },
    episodeDuration: {
        color: '#888',
        fontSize: scaleFont(17),
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
    closeButtonPressed: {
        transform: [{ scale: 0.95 }],
    },
    youtubeContainer: {
        borderRadius: scale(12),
        overflow: 'hidden',
        backgroundColor: '#000',
    },
});

export default TVSeriesDetailScreen;
