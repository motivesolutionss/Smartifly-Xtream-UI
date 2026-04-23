/**
 * TV Downloads Screen
 * 
 * Displays downloaded content available for offline viewing on TV.
 * Uses react-native-blob-util for file management.
 * 
 * @enterprise-grade
 */

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Pressable,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, scale, scaleFont, Icon } from '../../theme';
import useDownloadStore, { DownloadItem } from '../../store/downloadStore';
import { TVDownloadsScreenProps } from '../../navigation/types';


const TVDownloadsScreen: React.FC<TVDownloadsScreenProps> = ({ navigation: _navigation, focusEntryRef }) => {
    const downloads = useDownloadStore((state) => state.downloads);
    const removeDownload = useDownloadStore((state) => state.removeDownload);
    const refreshStorageMetrics = useDownloadStore((state) => state.refreshStorageMetrics);
    const storageUsage = useDownloadStore((state) => state.storageUsage);
    const nav = useNavigation<any>();
    const [focusedId, setFocusedId] = React.useState<string | null>(null);


    // Filter to show only completed downloads
    const completedDownloads = useMemo(() => (
        downloads.filter((d: DownloadItem) => d.status === 'completed')
    ), [downloads]);

    const downloadingItems = useMemo(() => (
        downloads.filter((d: DownloadItem) => d.status === 'downloading' || d.status === 'pending')
    ), [downloads]);

    React.useEffect(() => {
        refreshStorageMetrics();
    }, [refreshStorageMetrics]);

    const handlePlay = useCallback((item: DownloadItem) => {
        if (item.localPath) {
            nav.navigate('FullscreenPlayer', {
                type: item.type,
                item: {
                    ...item.data,
                    localPath: item.localPath,
                },
            });
        }
    }, [nav]);

    const handleDelete = useCallback((item: DownloadItem) => {
        Alert.alert(
            'Delete Download',
            `Are you sure you want to delete "${item.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeDownload(item.id),
                },
            ]
        );
    }, [removeDownload]);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const renderDownloadItem = ({ item, index: _index, isEntry }: { item: DownloadItem; index: number; isEntry: boolean }) => {
        const isDownloading = item.status === 'downloading' || item.status === 'pending';
        const progress = Math.round((item.progress || 0) * 100);
        const isFocused = focusedId === item.id;

        return (
            <Pressable
                ref={isEntry ? focusEntryRef : undefined}
                style={[
                    styles.itemCard,
                    isFocused && styles.itemCardFocused,
                ]}
                onFocus={() => setFocusedId(item.id)}
                onBlur={() => setFocusedId(null)}
                onPress={() => item.status === 'completed' && handlePlay(item)}
                onLongPress={() => item.status === 'completed' && handleDelete(item)}
                delayLongPress={800}
            >
                <Image
                    source={{ uri: item.thumbnail || 'https://via.placeholder.com/200x300' }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                {/* Play icon overlay when focused */}
                {isFocused && item.status === 'completed' && (
                    <View style={styles.playOverlay}>
                        <Icon name="play" size={scale(40)} color="#FFF" />
                    </View>
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemMeta}>
                        {item.type === 'movie' ? 'Movie' : 'Episode'} • {formatBytes(item.downloadedSize || 0)}
                    </Text>
                    {isDownloading && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progress}%` }]} />
                        </View>
                    )}
                    {/* TV Controls Hint */}
                    {isFocused && item.status === 'completed' && (
                        <Text style={styles.controlsHint}>Press to play • Long press to delete</Text>
                    )}
                </View>
            </Pressable>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Icon name="downloadSimple" size={scale(80)} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Downloads</Text>
            <Text style={styles.emptySubtitle}>
                Download movies and series episodes to watch offline
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Downloads</Text>
                <Text style={styles.storageInfo}>
                    {formatBytes(storageUsage.appUsed)} used • {formatBytes(storageUsage.available)} available
                </Text>
            </View>

            {/* Downloading Section */}
            {downloadingItems.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Downloading ({downloadingItems.length})</Text>
                    <FlatList
                        data={downloadingItems}
                        renderItem={({ item, index }) =>
                            renderDownloadItem({ item, index, isEntry: index === 0 })
                        }
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                </View>
            )}

            {/* Completed Downloads Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Offline ({completedDownloads.length})</Text>
                {completedDownloads.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <FlatList
                        data={completedDownloads}
                        renderItem={({ item, index }) =>
                            renderDownloadItem({ item, index, isEntry: downloadingItems.length === 0 && index === 0 })
                        }
                        keyExtractor={item => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: scale(40),
        paddingTop: scale(40),
    },
    header: {
        marginBottom: scale(30),
    },
    headerTitle: {
        fontSize: scaleFont(48),
        fontWeight: '900',
        color: '#FFF',
        marginBottom: scale(8),
    },
    storageInfo: {
        fontSize: scaleFont(16),
        color: colors.textMuted,
    },
    section: {
        marginBottom: scale(30),
    },
    sectionTitle: {
        fontSize: scaleFont(24),
        fontWeight: '700',
        color: '#FFF',
        marginBottom: scale(16),
    },
    listContent: {
        paddingRight: scale(40),
    },
    itemCard: {
        width: scale(280),
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scale(12),
        marginRight: scale(20),
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    itemCardFocused: {
        borderColor: colors.primary,
        transform: [{ scale: 1.03 }],
    },
    thumbnail: {
        width: '100%',
        height: scale(160),
    },
    itemInfo: {
        padding: scale(16),
    },
    itemTitle: {
        fontSize: scaleFont(18),
        fontWeight: '700',
        color: '#FFF',
        marginBottom: scale(4),
    },
    itemMeta: {
        fontSize: scaleFont(14),
        color: colors.textMuted,
    },
    progressContainer: {
        height: scale(4),
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: scale(2),
        marginTop: scale(8),
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: scale(12),
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    actionBtn: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: scale(10),
    },
    actionBtnFocused: {
        backgroundColor: colors.primary,
    },
    deleteBtn: {
        backgroundColor: 'rgba(255,0,0,0.2)',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: scale(60),
    },
    emptyTitle: {
        fontSize: scaleFont(28),
        fontWeight: '700',
        color: '#FFF',
        marginTop: scale(20),
    },
    emptySubtitle: {
        fontSize: scaleFont(16),
        color: colors.textMuted,
        marginTop: scale(8),
        textAlign: 'center',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: scale(160),
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlsHint: {
        fontSize: scaleFont(12),
        color: colors.textMuted,
        marginTop: scale(8),
        fontStyle: 'italic',
    },
});

export default TVDownloadsScreen;
