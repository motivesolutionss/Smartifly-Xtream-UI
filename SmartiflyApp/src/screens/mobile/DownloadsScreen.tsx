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
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, borderRadius, Icon, stylePresets } from '../../theme';
import useDownloadStore, { DownloadItem } from '../../store/downloadStore';
import FastImageComponent from '../../components/FastImageComponent';

const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DownloadsScreen: React.FC = () => {
    const navigation = useNavigation();
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
                    onPress: () => removeDownload(item.id)
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
                    onPress: () => clearAll()
                },
            ]
        );
    }, [clearAll]);

    const renderItem = useCallback(({ item }: { item: DownloadItem }) => (
        <View style={styles.itemCard}>
            <FastImageComponent
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
            />
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                    {item.quality.toUpperCase()} • {formatSize(item.downloadedSize || item.totalSize)}
                </Text>
                {item.status === 'downloading' && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.round(item.progress * 100)}%` }]} />
                        <Text style={styles.progressText}>{Math.round(item.progress * 100)}%</Text>
                    </View>
                )}
            </View>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item)}>
                <Icon name="trash" size={20} color={colors.error} />
            </TouchableOpacity>
        </View>
    ), [handleRemove]);

    const keyExtractor = useCallback((item: DownloadItem) => item.id, []);

    const storageAppPercent = useMemo(() => {
        if (!storageUsage.total) return 0;
        return (storageUsage.appUsed / storageUsage.total) * 100;
    }, [storageUsage.appUsed, storageUsage.total]);

    const listEmpty = useMemo(() => (
        <View style={styles.emptyContainer}>
            <Icon name="downloadSimple" size={64} color={colors.textMuted} weight="thin" />
            <Text style={styles.emptyTitle}>No Downloads</Text>
            <Text style={styles.emptySubtitle}>
                Movies and shows you download will appear here.
            </Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('MainTabs' as any, {
                    screen: 'HomeTab',
                    params: { screen: 'HomeMain' },
                })}
            >
                <Text style={styles.browseButtonText}>Browse Content</Text>
            </TouchableOpacity>
        </View>
    ), [navigation]);

    return (
        <View style={stylePresets.screenContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Downloads</Text>
                {downloads.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll}>
                        <Text style={styles.clearText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Storage Info */}
            <View style={styles.storageSection}>
                <View style={styles.storageRow}>
                    <Text style={styles.storageLabel}>Storage</Text>
                    <Text style={styles.storageValue}>
                        {formatSize(storageUsage.appUsed)} used of {formatSize(storageUsage.available)} available
                    </Text>
                </View>
                <View style={styles.storageBarContainer}>
                    <View style={[styles.storageBarUsed, { width: `${storageAppPercent}%` }]} />
                </View>
            </View>

            {/* Downloads List */}
            <FlashList
                data={downloads}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={listEmpty}
                // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                estimatedItemSize={96}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
        flex: 1,
        marginLeft: spacing.md,
    },
    clearText: {
        color: colors.error,
        fontWeight: '600',
    },
    storageSection: {
        padding: spacing.md,
        backgroundColor: colors.backgroundTertiary,
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    storageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    storageLabel: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    storageValue: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    storageBarContainer: {
        height: 6,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: 3,
        overflow: 'hidden',
    },
    storageBarUsed: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        padding: spacing.sm,
    },
    thumbnail: {
        width: 100,
        height: 60,
        borderRadius: borderRadius.sm,
    },
    itemInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    itemTitle: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 14,
    },
    itemMeta: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    removeButton: {
        padding: spacing.sm,
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
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
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
        borderRadius: borderRadius.md,
    },
    browseButtonText: {
        color: colors.textPrimary,
        fontWeight: 'bold',
    }
});

export default DownloadsScreen;
