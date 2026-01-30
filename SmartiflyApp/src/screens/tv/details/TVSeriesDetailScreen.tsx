/**
 * TV Series Detail Screen
 * 
 * Cinematic detail view for Series on TV.
 * Features: Season selector, Episode list, Metdata.
 * 
 * @enterprise-grade
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    Pressable,
    FlatList,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useStore from '../../../store';
import { colors, scale, scaleFont } from '../../../theme';
import { logger } from '../../../config';
import useTVBackHandler from '../../../utils/useTVBackHandler';
import { prefetchImage } from '../../../utils/image';

// Types
interface TVSeriesDetailScreenProps {
    route: {
        params: {
            series: any; // Raw series item
        };
    };
}

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

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const renderSeasonItem = ({ item, index }: { item: string; index: number }) => {
        const isSelected = selectedSeason === item;
        const isFocused = focusedSeasonId === item;

        return (
            <Pressable
                onPress={() => setSelectedSeason(item)}
                onFocus={() => setFocusedSeasonId(item)}
                onBlur={() => setFocusedSeasonId(null)}
                focusable
                hasTVPreferredFocus={!focusedSeasonId && index === 0}
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
                {isFocused && (
                    <View style={styles.playIconContainer}>
                        <Text style={styles.playIcon}>▶</Text>
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Image */}
            <Image
                source={{ uri: backdrop }}
                style={styles.backdrop}
                resizeMode="cover"
            />

            {/* Dark Overlay */}
            <View style={styles.overlay} />

            <View style={styles.contentContainer}>
                {/* Left: Info Panel */}
                <View style={styles.leftColumn}>
                    <Image
                        source={{ uri: poster }}
                        style={styles.poster}
                        resizeMode="cover"
                    />
                    <View style={styles.metaContainer}>
                        <Text style={styles.title}>{name}</Text>
                        <View style={styles.metaRow}>
                            {rating && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>★ {rating}</Text>
                                </View>
                            )}
                            <Text style={styles.metaText}>{seasons.length} Seasons</Text>
                        </View>
                        <Text style={styles.plot} numberOfLines={4}>{plot}</Text>
                    </View>
                </View>

                {/* Right: Seasons & Episodes */}
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        padding: scale(40),
    },
    leftColumn: {
        width: scale(300),
        marginRight: scale(40),
    },
    rightColumn: {
        flex: 1,
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: scale(12),
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: scale(20),
    },
    metaContainer: {

    },
    title: {
        fontSize: scaleFont(28),
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: scale(10),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(15),
    },
    badge: {
        backgroundColor: colors.accent,
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(4),
        marginRight: scale(10),
    },
    badgeText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: scaleFont(12),
    },
    metaText: {
        color: '#CCC',
        fontSize: scaleFont(14),
    },
    plot: {
        color: '#BBB',
        fontSize: scaleFont(14),
        lineHeight: scaleFont(20),
    },
    // Seasons
    seasonsContainer: {
        marginBottom: scale(20),
    },
    seasonsList: {
        paddingVertical: scale(5),
    },
    seasonChip: {
        paddingHorizontal: scale(20),
        paddingVertical: scale(10),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(20),
        marginRight: scale(10),
    },
    seasonChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    seasonChipFocused: {
        backgroundColor: colors.accent,
        transform: [{ scale: 1.05 }],
    },
    seasonText: {
        color: '#AAA',
        fontWeight: 'bold',
    },
    seasonTextActive: {
        color: '#FFF',
    },
    // Episodes
    episodesContainer: {
        flex: 1,
    },
    episodesList: {
        paddingBottom: scale(40),
    },
    episodeCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: scale(8),
        marginBottom: scale(10),
        height: scale(80),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    episodeCardFocused: {
        borderColor: colors.accent,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    episodeThumb: {
        width: scale(120),
        height: '100%',
        borderTopLeftRadius: scale(8),
        borderBottomLeftRadius: scale(8),
        marginRight: scale(15),
    },
    episodeInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: scale(10),
    },
    episodeNum: {
        color: colors.accent,
        fontSize: scaleFont(12),
        fontWeight: 'bold',
        marginBottom: scale(4),
    },
    episodeTitle: {
        color: '#FFF',
        fontSize: scaleFont(16),
        fontWeight: 'bold',
        marginBottom: scale(4),
    },
    episodeTitleFocused: {
        color: colors.accent,
    },
    episodeDuration: {
        color: '#888',
        fontSize: scaleFont(12),
    },
    playIconContainer: {
        marginRight: scale(20),
        width: scale(30),
        height: scale(30),
        borderRadius: scale(15),
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        color: '#000',
        fontSize: scaleFont(14),
    },
});

export default TVSeriesDetailScreen;
