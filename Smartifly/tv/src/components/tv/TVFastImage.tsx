/**
 * FastImageComponent
 *
 * Optimized image wrapper around @d11/react-native-fast-image.
 * Focused on instant perceived loading and cache reuse.
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, StyleProp, Animated, Easing, Image } from 'react-native';
import FastImage, { ImageStyle, OnLoadEvent } from '@d11/react-native-fast-image';
import { colors } from '../../theme';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import {
    isImageWarm,
    isRemoteImageUri,
    markImageWarm,
    normalizeImageUri,
} from '@smartifly/shared/src/utils/image';

interface Props {
    source: any;
    style?: StyleProp<ImageStyle>;
    showLoader?: boolean;
    suppressStateOverlays?: boolean;
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
const FAST_IMAGE_RETRY_LIMIT = 2;
const NATIVE_IMAGE_RETRY_LIMIT = 1;
const RETRY_DELAYS_MS = [220, 700, 1400];
const IMAGE_LOAD_TIMEOUT_MS = 3200;

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
    suppressStateOverlays = false,
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
    const [useNativeFallback, setUseNativeFallback] = useState(false);
    const [retryToken, setRetryToken] = useState(0);
    const perf = usePerfProfile();
    const effectivePriority = perf.tier === 'low' ? 'low' : priority;
    const hasLoadedCurrentSourceRef = useRef(false);
    const fastRetryCountRef = useRef(0);
    const nativeRetryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
        }
        setError(false);
        setUseNativeFallback(false);
        setIsReady(initialReady);
        setRetryToken(0);
        hasLoadedCurrentSourceRef.current = false;
        fastRetryCountRef.current = 0;
        nativeRetryCountRef.current = 0;
    }, [initialReady, sourceUri]);

    useEffect(() => {
        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
            }
        };
    }, []);

    const shouldUseFallback = error && Boolean(normalizedFallback);
    const renderSource = shouldUseFallback ? normalizedFallback : normalizedSource;
    const renderSourceUri = useMemo(() => extractSourceUri(renderSource), [renderSource]);

    const handleLoad = useCallback((event: OnLoadEvent) => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
        }
        hasLoadedCurrentSourceRef.current = true;
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

    const scheduleRetry = useCallback((loader: 'fast' | 'native') => {
        const retryCountRef = loader === 'fast' ? fastRetryCountRef : nativeRetryCountRef;
        const retryLimit = loader === 'fast' ? FAST_IMAGE_RETRY_LIMIT : NATIVE_IMAGE_RETRY_LIMIT;

        if (retryCountRef.current >= retryLimit) {
            return false;
        }

        const delay = RETRY_DELAYS_MS[Math.min(retryCountRef.current, RETRY_DELAYS_MS.length - 1)];
        retryCountRef.current += 1;
        setIsReady(false);

        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
        }

        retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            setRetryToken((prev) => prev + 1);
        }, delay);

        return true;
    }, []);

    const handleError = useCallback(() => {
        if (hasLoadedCurrentSourceRef.current && !normalizedFallback) {
            setIsReady(true);
            imageOpacity.setValue(1);
            return;
        }
        if (scheduleRetry('fast')) {
            return;
        }
        if (!useNativeFallback && normalizedSource && !normalizedFallback) {
            setUseNativeFallback(true);
            setIsReady(initialReady);
            nativeRetryCountRef.current = 0;
            setRetryToken((prev) => prev + 1);
            return;
        }
        setError(true);
        setIsReady(true);
        imageOpacity.setValue(1);
        onError?.();
    }, [imageOpacity, initialReady, normalizedFallback, normalizedSource, onError, scheduleRetry, useNativeFallback]);

    const handleNativeLoad = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
        }
        if (renderSourceUri) {
            markImageWarm(renderSourceUri);
        }
        hasLoadedCurrentSourceRef.current = true;
        imageOpacity.setValue(1);
        setIsReady(true);
        onLoad?.({} as OnLoadEvent);
    }, [imageOpacity, onLoad, renderSourceUri]);

    const handleNativeError = useCallback(() => {
        if (scheduleRetry('native')) {
            return;
        }
        setError(true);
        setIsReady(true);
        imageOpacity.setValue(1);
        onError?.();
    }, [imageOpacity, onError, scheduleRetry]);

    const handleLoadEnd = useCallback(() => {
        onLoadEnd?.();
    }, [onLoadEnd]);

    useEffect(() => {
        if (!renderSourceUri || !sourceIsRemote || hasLoadedCurrentSourceRef.current || error) {
            return;
        }

        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
        }

        loadTimeoutRef.current = setTimeout(() => {
            loadTimeoutRef.current = null;
            if (hasLoadedCurrentSourceRef.current) return;
            if (useNativeFallback) {
                handleNativeError();
                return;
            }
            handleError();
        }, IMAGE_LOAD_TIMEOUT_MS);

        return () => {
            if (loadTimeoutRef.current) {
                clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = null;
            }
        };
    }, [error, handleError, handleNativeError, renderSourceUri, retryToken, sourceIsRemote, useNativeFallback]);

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
    const shouldRenderImage = Boolean(renderSource);

    return (
        <View style={[styles.container, style]}>
            {shouldRenderImage ? (
                <Animated.View style={animatedStyle}>
                    {useNativeFallback ? (
                        <Image
                            key={`native:${renderSourceUri}:${retryToken}`}
                            style={StyleSheet.absoluteFill}
                            source={renderSource as any}
                            onLoad={handleNativeLoad}
                            onError={handleNativeError}
                            resizeMode={resizeMode}
                        />
                    ) : (
                        <FastImage
                            key={`fast:${renderSourceUri}:${retryToken}`}
                            style={StyleSheet.absoluteFill}
                            source={fastImageSource}
                            onLoad={handleLoad}
                            onLoadEnd={handleLoadEnd}
                            onError={handleError}
                            resizeMode={fastResizeMode}
                        />
                    )}
                </Animated.View>
            ) : null}

            {shouldShowLoaderOverlay && !suppressStateOverlays && (
                <View style={styles.loadingOverlay} />
            )}

            {error && !normalizedFallback && !suppressStateOverlays && (
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
