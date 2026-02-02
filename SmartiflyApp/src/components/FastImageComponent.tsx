/**
 * FastImageComponent - Using standard React Native Image
 * 
 * Replacement for react-native-fast-image to fix compatibility issues
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ImageStyle, StyleProp, ActivityIndicator, Image, ImageSourcePropType } from 'react-native';
import { colors } from '../theme';
import { prefetchImage } from '../utils/image';

interface Props {
    source: ImageSourcePropType;
    style?: StyleProp<ImageStyle>;
    showLoader?: boolean;
    fallbackSource?: ImageSourcePropType;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const FastImageComponent: React.FC<Props> = ({
    source,
    style,
    showLoader = false,
    fallbackSource,
    resizeMode = 'cover',
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleLoadStart = () => setLoading(true);
    const handleLoadEnd = () => setLoading(false);
    const handleError = () => {
        setLoading(false);
        setError(true);
    };

    const finalSource = error && fallbackSource ? fallbackSource : source;
    const uri = typeof finalSource === 'object' && finalSource && 'uri' in finalSource
        ? finalSource.uri
        : undefined;

    useEffect(() => {
        if (typeof uri === 'string') {
            prefetchImage(uri);
        }
    }, [uri]);

    return (
        <View style={[styles.container, style]}>
            <Image
                style={[StyleSheet.absoluteFill, style]}
                source={finalSource}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleError}
                resizeMode={resizeMode}
            />

            {showLoader && loading && !error && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            {error && !fallbackSource && (
                <View style={[styles.errorContainer, style]}>
                    {/* Error placeholder */}
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

export default FastImageComponent;
