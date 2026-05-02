/**
 * TVDownloadButton
 * 
 * A TV-optimized download button that works with focus navigation.
 * Uses react-native-blob-util for background downloads.
 */

import React, { useMemo } from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { colors, scale, scaleFont, Icon } from '../../theme';
import useDownloadStore from '../../store/downloadStore';
import downloadService from '../../services/downloadService';
import useStore from '../../store';
import { logger } from '../../config';

interface TVDownloadButtonProps {
    item: {
        id: string;
        name: string;
        stream_icon?: string;
        container_extension?: string;
        type: 'movie' | 'series';
    };
    style?: any;
    labelStyle?: any;
    iconSize?: number;
    onFocus?: () => void;
    onBlur?: () => void;
    isFocused?: boolean;
    invertOnFocus?: boolean;
    focusMode?: 'primary' | 'secondary';
}

const TVDownloadButton: React.FC<TVDownloadButtonProps> = ({
    item,
    style,
    labelStyle,
    iconSize,
    onFocus,
    onBlur,
    isFocused = false,
    invertOnFocus = true,
    focusMode = 'primary',
}) => {
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
                return;
            }
            if (download.status === 'downloading' || download.status === 'pending') {
                downloadService.cancelDownload(item.id);
                removeDownload(item.id);
                return;
            }
        }

        const api = getXtreamAPI();
        if (!api) return;

        if (!downloadService.isAvailable()) {
            Alert.alert(
                "Feature Unavailable",
                "Downloads require a native rebuild."
            );
            return;
        }

        const extension = item.container_extension || 'mkv';
        const url = item.type === 'movie'
            ? api.getVodStreamUrl(parseInt(item.id, 10), extension)
            : api.getSeriesEpisodeUrl(parseInt(item.id, 10), extension);

        if (!url) {
            logger.error('Could not resolve download URL');
            return;
        }

        addDownload({
            id: item.id,
            title: item.name,
            thumbnail: item.stream_icon,
            type: item.type,
            url,
            quality: 'hd',
            data: item,
        });

        const filename = `${item.id}.${extension}`;
        downloadService.startDownload(item.id, url, filename);
    };

    const getButtonContent = () => {
        if (download?.status === 'completed') {
            return {
                icon: 'checkCircle',
                label: 'Downloaded',
                color: colors.success,
            };
        }
        if (download?.status === 'downloading' || download?.status === 'pending') {
            const progress = Math.round((download.progress || 0) * 100);
            return {
                icon: 'arrowCounterClockwise',
                label: progress > 0 ? `${progress}%` : 'Starting...',
                color: colors.primary,
                loading: true,
            };
        }
        if (download?.status === 'error') {
            return {
                icon: 'warning',
                label: 'Retry',
                color: colors.error,
            };
        }
        return {
            icon: 'downloadSimple',
            label: 'Download',
            color: '#FFF',
        };
    };

    const content = getButtonContent();

    return (
        <Pressable
            onPress={handleDownload}
            onFocus={onFocus}
            onBlur={onBlur}
            style={({ pressed }) => [
                styles.button,
                isFocused && (focusMode === 'secondary' ? styles.buttonFocusedSecondary : styles.buttonFocused),
                pressed && { transform: [{ scale: 0.98 }] },
                style,
            ]}
        >
            {content.loading ? (
                <ActivityIndicator size="small" color={content.color} style={styles.icon} />
            ) : (
                <Icon
                    name={content.icon}
                    size={iconSize ?? scale(20)}
                    color={isFocused && invertOnFocus ? colors.background : content.color}
                    style={styles.icon}
                />
            )}
            <Text style={[
                styles.buttonText,
                labelStyle,
                isFocused && invertOnFocus && { color: colors.background }
            ]}>
                {content.label}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(14),
        paddingHorizontal: scale(24),
        borderRadius: scale(10),
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonFocused: {
        backgroundColor: '#FFF',
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    buttonFocusedSecondary: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    buttonText: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    icon: {
        marginRight: scale(10),
    },
});

export default React.memo(TVDownloadButton);
