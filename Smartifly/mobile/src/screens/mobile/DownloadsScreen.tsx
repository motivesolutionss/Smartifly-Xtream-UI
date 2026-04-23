/**
 * DownloadsScreen
 *
 * Central hub for managing offline content.
 * Displays storage usage, download queue, and completed items.
 */

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, borderRadius, Icon, stylePresets } from '../../theme';
import useDownloadStore, { DownloadItem } from '../../store/downloadStore';
import FastImageComponent from '../../components/FastImageComponent';

const MAIN_TAB_BOTTOM_SPACER = 112;

const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const DownloadsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const downloads = useDownloadStore((state) => state.downloads);
    const storageUsage = useDownloadStore((state) => state.storageUsage);
    const removeDownload = useDownloadStore((state) => state.removeDownload);
    const clearAll = useDownloadStore((state) => state.clearAll);

    const handleRemove = useCallback((item: DownloadItem) => {
        Alert.alert(
            'Remove Download',
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

    const handleClearAll = useCallback(() => {
        Alert.alert(
            'Clear All Downloads',
            'This will delete all offline content. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: () => clearAll(),
                },
            ]
        );
    }, [clearAll]);

    const storageAppPercent = useMemo(() => {
        if (!storageUsage.total) return 0;
        return (storageUsage.appUsed / storageUsage.total) * 100;
    }, [storageUsage.appUsed, storageUsage.total]);

    const containerStyle = useMemo(
        () => [styles.screenContainer, { paddingTop: insets.top }],
        [insets.top]
    );

    const listContentStyle = useMemo(
        () => [styles.listContent, { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER }],
        [insets.bottom]
    );

    const storageBarStyle = useMemo(
        () => ({ width: `${Math.min(storageAppPercent, 100)}%` as const }),
        [storageAppPercent]
    );

    const getProgressFillStyle = useCallback(
        (progress: number) => ({ width: `${Math.min(Math.round(progress * 100), 100)}%` as const }),
        []
    );

    const renderItem = useCallback(({ item }: { item: DownloadItem }) => (
        <View style={styles.itemCard}>
            {item.thumbnail ? (
                <FastImageComponent
                    source={{ uri: item.thumbnail }}
                    style={styles.thumbnail}
                />
            ) : (
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                    <Icon name="downloadSimple" size={24} color={colors.textMuted} />
                </View>
            )}

            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                    {item.quality.toUpperCase()} | {formatSize(item.downloadedSize || item.totalSize)}
                </Text>
                {item.status === 'downloading' && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, getProgressFillStyle(item.progress)]} />
                        <Text style={styles.progressText}>{Math.round(item.progress * 100)}%</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item)}>
                <Icon name="trash" size={18} color={colors.error} />
            </TouchableOpacity>
        </View>
    ), [getProgressFillStyle, handleRemove]);

    const keyExtractor = useCallback((item: DownloadItem) => item.id, []);

    const listEmpty = useMemo(() => (
        <View style={styles.emptyContainer}>
            <Icon name="downloadSimple" size={64} color={colors.textMuted} weight="thin" />
            <Text style={styles.emptyTitle}>No Downloads</Text>
            <Text style={styles.emptySubtitle}>
                Movies and shows you download will appear here.
            </Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('MainTabs', {
                    screen: 'HomeTab',
                    params: { screen: 'HomeMain' },
                })}
            >
                <Text style={styles.browseButtonText}>Browse Content</Text>
            </TouchableOpacity>
        </View>
    ), [navigation]);

    return (
        <View style={containerStyle}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Downloads</Text>
                {downloads.length > 0 ? (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Text style={styles.clearText}>Clear All</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.clearButtonPlaceholder} />
                )}
            </View>

            <View style={styles.storageSection}>
                <View style={styles.storageRow}>
                    <Text style={styles.storageLabel}>Storage</Text>
                    <Text style={styles.storageValue}>
                        {formatSize(storageUsage.appUsed)} used of {formatSize(storageUsage.available)} available
                    </Text>
                </View>
                <View style={styles.storageBarContainer}>
                    <View style={[styles.storageBarUsed, storageBarStyle]} />
                </View>
            </View>

            <FlashList
                data={downloads}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={listContentStyle}
                ListEmptyComponent={listEmpty}
                // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                estimatedItemSize={108}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                getItemType={(item) => item.status}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    screenContainer: {
        ...stylePresets.screenContainer,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        justifyContent: 'space-between',
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textPrimary,
        flex: 1,
        marginLeft: spacing.base,
    },
    clearButton: {
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.error,
        borderRadius: borderRadius.round,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        minWidth: 84,
        alignItems: 'center',
    },
    clearButtonPlaceholder: {
        minWidth: 84,
    },
    clearText: {
        color: colors.error,
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    storageSection: {
        padding: spacing.base,
        backgroundColor: colors.backgroundSecondary,
        marginHorizontal: spacing.base,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    storageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    storageLabel: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    storageValue: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        flexShrink: 1,
        textAlign: 'right',
    },
    storageBarContainer: {
        height: 8,
        backgroundColor: colors.backgroundInput,
        borderRadius: borderRadius.round,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    storageBarUsed: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    listContent: {
        paddingHorizontal: spacing.base,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        padding: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    thumbnail: {
        width: 112,
        height: 64,
        borderRadius: borderRadius.md,
    },
    thumbnailFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundInput,
        borderWidth: 1,
        borderColor: colors.border,
    },
    itemInfo: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    itemTitle: {
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 15,
    },
    itemMeta: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 3,
        fontWeight: '600',
    },
    removeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    progressContainer: {
        marginTop: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    progressText: {
        color: colors.primary,
        fontSize: 10,
        marginLeft: spacing.xs,
        fontWeight: '700',
    },
    emptyContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '800',
        marginTop: spacing.lg,
    },
    emptySubtitle: {
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.sm,
        fontSize: 14,
    },
    browseButton: {
        marginTop: spacing.xl,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    browseButtonText: {
        color: colors.textPrimary,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
});

export default DownloadsScreen;
