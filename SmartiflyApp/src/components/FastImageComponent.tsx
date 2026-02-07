/**
 * FastImageComponent - Using @d11/react-native-fast-image
 * 
 * Optimized image component with caching and performance benefits
 */
import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ActivityIndicator } from 'react-native';
import FastImage, { ImageStyle, OnLoadEvent, OnProgressEvent } from '@d11/react-native-fast-image';
import { colors } from '../theme';

interface Props {
    source: any; // Using any for compatibility with both URI objects and local requires
    style?: StyleProp<ImageStyle>;
    showLoader?: boolean;
    fallbackSource?: any;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    priority?: 'low' | 'normal' | 'high';
    cache?: 'immutable' | 'web' | 'cacheOnly';
}

const FastImageComponent: React.FC<Props> = ({
    source,
    style,
    showLoader = false,
    fallbackSource,
    resizeMode = 'cover',
    priority = 'normal',
    cache = 'immutable',
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
    };

    const handleError = () => {
        if (showLoader) {
            setLoading(false);
        }
        setError(true);
    };

    // Construct the source object properly for FastImage
    const finalSource = error && fallbackSource
        ? fallbackSource
        : (typeof source === 'string' ? { uri: source } : source);

    // Apply priority and cache to the source if it's a URI object
    const fastImageSource = (finalSource && typeof finalSource === 'object' && finalSource.uri)
        ? {
            ...finalSource,
            priority: FastImage.priority[priority],
            cache: FastImage.cacheControl[cache],
        }
        : finalSource;

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
