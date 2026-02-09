/**
 * FastImageComponent - Using @d11/react-native-fast-image
 * 
 * Optimized image component with caching and performance benefits
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, StyleProp, ActivityIndicator } from 'react-native';
import FastImage, { ImageStyle, OnLoadEvent } from '@d11/react-native-fast-image';
import { colors } from '../theme';

interface Props {
    source: any; // Using any for compatibility with both URI objects and local requires
    style?: StyleProp<ImageStyle>;
    showLoader?: boolean;
    fallbackSource?: any;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    priority?: 'low' | 'normal' | 'high';
    cache?: 'immutable' | 'web' | 'cacheOnly';
    onLoad?: (event: OnLoadEvent) => void;
    onError?: () => void;
    onLoadEnd?: () => void;
}

const FastImageComponent: React.FC<Props> = ({
    source,
    style,
    showLoader = false,
    fallbackSource,
    resizeMode = 'cover',
    priority = 'normal',
    cache = 'immutable',
    onLoad,
    onError,
    onLoadEnd,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleLoadStart = () => {
        if (showLoader) {
            setLoading(true);
        }
    };

    const handleLoad = (event: OnLoadEvent) => {
        if (showLoader) {
            setLoading(false);
        }
        onLoad?.(event);
    };

    const handleError = () => {
        if (showLoader) {
            setLoading(false);
        }
        setError(true);
        onError?.();
    };

    const handleLoadEnd = () => {
        if (showLoader) {
            setLoading(false);
        }
        onLoadEnd?.();
    };

    const sourceKey = useMemo(() => {
        if (typeof source === 'string') return source;
        if (source && typeof source === 'object' && 'uri' in source) {
            return String((source as any).uri || '');
        }
        return '';
    }, [source]);

    useEffect(() => {
        setError(false);
        if (showLoader) {
            setLoading(false);
        }
    }, [sourceKey, showLoader]);

    const shouldUseFallback = error && fallbackSource;

    const remoteSource = useMemo(() => (sourceKey ? { uri: sourceKey } : null), [sourceKey]);

    const baseSource = useMemo(() => {
        if (shouldUseFallback) return fallbackSource;
        if (remoteSource) return remoteSource;
        return source;
    }, [shouldUseFallback, fallbackSource, remoteSource, source]);

    // Apply priority and cache to the source if it's a URI object
    const fastImageSource = useMemo(() => {
        if (baseSource && typeof baseSource === 'object' && 'uri' in baseSource) {
            return {
                ...(baseSource as any),
                priority: FastImage.priority[priority],
                cache: FastImage.cacheControl[cache],
            };
        }
        return baseSource;
    }, [baseSource, priority, cache]);

    const fastResizeMode = resizeMode === 'stretch'
        ? FastImage.resizeMode.stretch
        : resizeMode === 'contain'
            ? FastImage.resizeMode.contain
            : resizeMode === 'center'
                ? FastImage.resizeMode.center
                : FastImage.resizeMode.cover;

    return (
        <View style={[styles.container, style]}>
            <FastImage
                style={StyleSheet.absoluteFill}
                source={fastImageSource}
                onLoadStart={handleLoadStart}
                onLoad={handleLoad}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                resizeMode={fastResizeMode}
            />

            {showLoader && loading && !error && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            {error && !fallbackSource && (
                <View style={styles.errorContainer}>
                    {/* Error placeholder could be an icon */}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: colors.cardBackground,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBackground,
    },
});

export default React.memo(FastImageComponent);
