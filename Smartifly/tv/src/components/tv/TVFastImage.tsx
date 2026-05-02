/**
 * FastImageComponent
 *
 * Optimized image wrapper around @d11/react-native-fast-image.
 * Focused on instant perceived loading and cache reuse.
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, StyleProp, Animated, Easing } from 'react-native';
import FastImage, { ImageStyle, OnLoadEvent } from '@d11/react-native-fast-image';
import { colors } from '../../theme';
import { usePerfProfile } from '../../utils/perf';
import {
    isImageWarm,
    isRemoteImageUri,
    markImageWarm,
    normalizeImageUri,
} from '../../utils/image';

interface Props {
    source: any;
    style?: StyleProp<ImageStyle>;
    showLoader?: boolean;
    fallbackSource?: any;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    priority?: 'low' | 'normal' | 'high';
    cache?: 'immutable' | 'web' | 'cacheOnly';
    onLoad?: (event: OnLoadEvent) => void;
    onError?: () => void;
    onLoadEnd?: () => void;
    enableColdFade?: boolean;
}

const COLD_FADE_DURATION_MS = 80;

const resolveSource = (input: any) => {
    if (!input) return null;
    if (typeof input === 'string') {
        return { uri: normalizeImageUri(input) };
    }
    if (typeof input === 'object' && 'uri' in input) {
        return {
            ...input,
            uri: normalizeImageUri((input as any).uri),
        };
    }
    return input;
};

const extractSourceUri = (input: any) => {
    if (!input) return '';
    if (typeof input === 'string') return normalizeImageUri(input);
    if (typeof input === 'object' && 'uri' in input) {
        return normalizeImageUri((input as any).uri);
    }
    return '';
};

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
    enableColdFade = true,
}) => {
    const [error, setError] = useState(false);
    const perf = usePerfProfile();
    const effectivePriority = perf.tier === 'low' ? 'low' : priority;

    const {
        normalizedSource,
        normalizedFallback,
        sourceUri,
        sourceIsRemote,
    } = useMemo(() => {
        const nextSource = resolveSource(source);
        const nextFallback = resolveSource(fallbackSource);
        const nextUri = extractSourceUri(nextSource);
        return {
            normalizedSource: nextSource,
            normalizedFallback: nextFallback,
            sourceUri: nextUri,
            sourceIsRemote: isRemoteImageUri(nextUri),
        };
    }, [fallbackSource, source]);

    const warmAtSourceChange = useMemo(() => {
        if (!sourceIsRemote) return true;
        return isImageWarm(sourceUri);
    }, [sourceIsRemote, sourceUri]);

    const initialReady = useMemo(() => {
        if (!showLoader) return true;
        if (!sourceIsRemote) return true;
        return warmAtSourceChange;
    }, [showLoader, sourceIsRemote, warmAtSourceChange]);

    const shouldAnimateOnLoad = useMemo(() => (
        enableColdFade && sourceIsRemote && !warmAtSourceChange
    ), [enableColdFade, sourceIsRemote, warmAtSourceChange]);

    const [isReady, setIsReady] = useState(initialReady);
    const imageOpacityRef = useRef(new Animated.Value(1));
    const imageOpacity = imageOpacityRef.current;

    useEffect(() => {
        imageOpacity.setValue(shouldAnimateOnLoad ? 0 : 1);
    }, [imageOpacity, shouldAnimateOnLoad, sourceUri]);

    useEffect(() => {
        setError(false);
        setIsReady(initialReady);
    }, [initialReady, sourceUri]);

    const shouldUseFallback = error && Boolean(normalizedFallback);
    const renderSource = shouldUseFallback ? normalizedFallback : normalizedSource;
    const renderSourceUri = useMemo(() => extractSourceUri(renderSource), [renderSource]);

    const handleLoad = useCallback((event: OnLoadEvent) => {
        if (renderSourceUri) {
            markImageWarm(renderSourceUri);
        }
        if (shouldAnimateOnLoad) {
            Animated.timing(imageOpacity, {
                toValue: 1,
                duration: COLD_FADE_DURATION_MS,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else {
            imageOpacity.setValue(1);
        }
        setIsReady((prev) => (prev ? prev : true));
        onLoad?.(event);
    }, [imageOpacity, onLoad, renderSourceUri, shouldAnimateOnLoad]);

    const handleError = useCallback(() => {
        setError(true);
        setIsReady(true);
        imageOpacity.setValue(1);
        onError?.();
    }, [imageOpacity, onError]);

    const handleLoadEnd = useCallback(() => {
        onLoadEnd?.();
    }, [onLoadEnd]);

    const fastImageSource = useMemo(() => {
        if (!renderSource) return null;

        if (typeof renderSource === 'object' && 'uri' in renderSource) {
            const sourceObject = renderSource as any;
            return {
                ...sourceObject,
                priority: sourceObject.priority ?? FastImage.priority[effectivePriority],
                cache: sourceObject.cache ?? FastImage.cacheControl[cache],
            };
        }

        return renderSource;
    }, [cache, effectivePriority, renderSource]);

    const fastResizeMode = useMemo(() => {
        switch (resizeMode) {
            case 'stretch':
                return FastImage.resizeMode.stretch;
            case 'contain':
                return FastImage.resizeMode.contain;
            case 'center':
                return FastImage.resizeMode.center;
            default:
                return FastImage.resizeMode.cover;
        }
    }, [resizeMode]);

    const animatedStyle = useMemo(
        () => [StyleSheet.absoluteFill, { opacity: shouldAnimateOnLoad ? imageOpacity : 1 }],
        [imageOpacity, shouldAnimateOnLoad]
    );
    const shouldShowLoaderOverlay = showLoader && !isReady && !shouldUseFallback;

    if (!renderSource && !error) return <View style={[styles.container, style]} />;

    return (
        <View style={[styles.container, style]}>
            <Animated.View style={animatedStyle}>
                <FastImage
                    style={StyleSheet.absoluteFill}
                    source={fastImageSource}
                    onLoad={handleLoad}
                    onLoadEnd={handleLoadEnd}
                    onError={handleError}
                    resizeMode={fastResizeMode}
                />
            </Animated.View>

            {shouldShowLoaderOverlay && (
                <View style={styles.loadingOverlay} />
            )}

            {error && !normalizedFallback && (
                <View style={styles.errorContainer} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: colors.cardBackground,
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBackground,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.backgroundTertiary,
    },
});

export default React.memo(FastImageComponent);
