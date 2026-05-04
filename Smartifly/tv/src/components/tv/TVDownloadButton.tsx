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
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { colors, scale, scaleFont, Icon } from '../../theme';
import useDownloadStore from '@smartifly/shared/src/store/downloadStore';
import downloadService from '@smartifly/shared/src/services/downloadService';
import useStore from '@smartifly/shared/src/store';
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
    const focused = useSharedValue(isFocused ? 1 : 0);
    const scaleValue = useSharedValue(isFocused ? 1.05 : 1);

    const shellStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255,255,255,0.15)', focusMode === 'secondary' ? 'rgba(255,255,255,0.3)' : '#FFFFFF']
        ),
        borderColor: interpolateColor(
            focused.value,
            [0, 1],
            ['rgba(255,255,255,0.1)', '#FFFFFF']
        ),
        transform: [{ scale: scaleValue.value }],
        shadowOpacity: focused.value > 0 ? 0.5 : 0,
        shadowRadius: focused.value > 0 ? 10 : 0,
    }), [focusMode, scaleValue]);

    const textStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            focused.value,
            [0, 1],
            ['#FFFFFF', invertOnFocus ? colors.background : '#FFFFFF']
        ),
    }));

    const handleFocusLocal = () => {
        focused.value = withTiming(1, { duration: 90 });
        scaleValue.value = withSpring(1.05, { damping: 16, stiffness: 220, mass: 0.6 });
        onFocus?.();
    };

    const handleBlurLocal = () => {
        focused.value = withTiming(0, { duration: 90 });
        scaleValue.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.6 });
        onBlur?.();
    };

    return (
        <Animated.View style={[styles.button, shellStyle, style]}>
            <Pressable
                onPress={handleDownload}
                onFocus={handleFocusLocal}
                onBlur={handleBlurLocal}
                style={({ pressed }) => [
                    styles.pressable,
                    pressed && styles.pressed,
                ]}
            >
                {content.loading ? (
                    <ActivityIndicator size="small" color={content.color} style={styles.icon} />
                ) : (
                    <Icon
                        name={content.icon}
                        size={iconSize ?? scale(20)}
                        color={invertOnFocus ? content.color : content.color}
                        style={styles.icon}
                    />
                )}
                <Animated.Text style={[styles.buttonText, labelStyle, textStyle]}>
                    {content.label}
                </Animated.Text>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(10),
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pressable: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scale(14),
        paddingHorizontal: scale(24),
        borderRadius: scale(10),
    },
    pressed: {
        transform: [{ scale: 0.98 }],
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
