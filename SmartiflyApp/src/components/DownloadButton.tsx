/**
 * DownloadButton
 * 
 * A smart button that handles download initiation, progress display,
 * and completion states using react-native-blob-util.
 */

import React, { useMemo } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
    Alert,
} from 'react-native';
import { colors, spacing, borderRadius, Icon } from '../theme';
import useDownloadStore from '../store/downloadStore';
import downloadService from '../services/downloadService';
import useStore from '../store';
import { logger } from '../config';

interface DownloadButtonProps {
    item: {
        id: string;
        name: string;
        stream_icon?: string;
        container_extension?: string;
        type: 'movie' | 'series';
    };
    style?: any;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ item, style }) => {
    const downloads = useDownloadStore((state) => state.downloads);
    const addDownload = useDownloadStore((state) => state.addDownload);
    const removeDownload = useDownloadStore((state) => state.removeDownload);
    const getXtreamAPI = useStore((state) => state.getXtreamAPI);

    const download = useMemo(() => (
        downloads.find(d => d.id === item.id)
    ), [downloads, item.id]);

    const handleDownload = async () => {
        if (download) {
            if (download.status === 'completed') {
                // Already downloaded, maybe offer to delete or just do nothing
                return;
            }
            if (download.status === 'downloading' || download.status === 'pending') {
                // Cancel download
                downloadService.cancelDownload(item.id);
                removeDownload(item.id);
                return;
            }
        }

        const api = getXtreamAPI();
        if (!api) return;

        // Check if download service is available
        if (!downloadService.isAvailable()) {
            Alert.alert(
                "Feature Unavailable",
                "Downloads require a native rebuild. Please run 'npx react-native run-android' to enable this feature."
            );
            return;
        }

        // Get the actual stream URL
        const extension = item.container_extension || 'mkv';
        const url = item.type === 'movie'
            ? api.getVodStreamUrl(parseInt(item.id, 10), extension)
            : ''; // For series, we'd need the specific episode ID

        if (!url) {
            logger.error('Could not resolve download URL');
            return;
        }

        // Add to store
        addDownload({
            id: item.id,
            title: item.name,
            thumbnail: item.stream_icon,
            type: item.type,
            url,
            quality: 'hd',
            data: item,
        });

        // Start the download with filename only (service handles directory)
        const filename = `${item.id}.${extension}`;
        downloadService.startDownload(item.id, url, filename);
    };

    if (download?.status === 'completed') {
        return (
            <View style={[styles.container, styles.completed, style]}>
                <Icon name="checkCircle" size={20} color={colors.success} weight="fill" />
                <Text style={styles.text}>Downloaded</Text>
            </View>
        );
    }

    if (download?.status === 'downloading' || download?.status === 'pending') {
        const progress = Math.round((download.progress || 0) * 100);
        return (
            <TouchableOpacity style={[styles.container, styles.active, style]} onPress={handleDownload}>
                <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
                <Text style={styles.text}>{progress > 0 ? `${progress}%` : 'Starting...'}</Text>
            </TouchableOpacity>
        );
    }

    if (download?.status === 'error') {
        return (
            <TouchableOpacity style={[styles.container, styles.error, style]} onPress={handleDownload}>
                <Icon name="warning" size={20} color={colors.error} weight="fill" />
                <Text style={styles.text}>Retry</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={[styles.container, style]} onPress={handleDownload}>
            <Icon name="downloadSimple" size={20} color={colors.textPrimary} weight="bold" />
            <Text style={styles.text}>Download</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    active: {
        borderColor: colors.primary,
    },
    completed: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    error: {
        borderColor: colors.error,
    },
    text: {
        color: colors.textPrimary,
        marginLeft: spacing.sm,
        fontSize: 14,
        fontWeight: '600',
    },
    loader: {
        marginRight: spacing.xs,
    }
});

export default React.memo(DownloadButton);
