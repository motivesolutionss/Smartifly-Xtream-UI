/**
 * Profile Avatar Component
 *
 * Reusable avatar display for profile selection and editing.
 * Supports TV focus states and kids badge overlay.
 *
 * @enterprise-grade
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { AvatarId, AVATAR_CHARACTERS, AVATAR_COLORS, AVATAR_IMAGE_URLS } from '@smartifly/shared/src/store/profileStore';
import { colors, scale, scaleFont, Icon } from '../../theme';

// =============================================================================
// TYPES
// =============================================================================

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface ProfileAvatarProps {
    /** Avatar identifier */
    avatar: AvatarId;
    /** Display name (shows initials if no avatar image) */
    name?: string;
    /** Size variant */
    size?: AvatarSize;
    /** Show kids badge */
    isKids?: boolean;
    /** Show edit overlay */
    showEdit?: boolean;
    /** Show add icon (for "Add Profile" card) */
    isAddNew?: boolean;
    /** Is focused (TV navigation) */
    isFocused?: boolean;
    /** Is selected (for avatar picker) */
    isSelected?: boolean;
    /** On press handler */
    onPress?: () => void;
    /** Custom container style */
    style?: ViewStyle;
    /** Enable focusable for TV */
    focusable?: boolean;
    /** Has TV preferred focus */
    hasTVPreferredFocus?: boolean;
}

// =============================================================================
// SIZE MAPPINGS
// =============================================================================

const SIZES: Record<AvatarSize, { container: number; text: number; badge: number; icon: number }> = {
    small: { container: 40, text: 16, badge: 16, icon: 16 },
    medium: { container: 80, text: 28, badge: 24, icon: 24 },
    large: { container: 120, text: 40, badge: 32, icon: 32 },
    xlarge: { container: 160, text: 56, badge: 40, icon: 48 },
};

// =============================================================================
// COMPONENT
// =============================================================================

import AnimatedRe, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    interpolate,
} from 'react-native-reanimated';

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
    avatar,
    name,
    size = 'medium',
    isKids = false,
    showEdit = false,
    isAddNew = false,
    isFocused = false,
    isSelected = false,
    onPress,
    style,
    focusable = true,
    hasTVPreferredFocus = false,
}) => {
    const focusState = useSharedValue(0);
    const pulseValue = useSharedValue(1);
    const [imageLoadFailed, setImageLoadFailed] = useState(false);

    useEffect(() => {
        focusState.value = withSpring(isFocused ? 1 : 0, { damping: 12, stiffness: 100 });

        if (isFocused) {
            pulseValue.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 2000 }),
                    withTiming(1, { duration: 2000 })
                ),
                -1,
                true
            );
        } else {
            pulseValue.value = withTiming(1, { duration: 300 });
        }
    }, [isFocused, focusState, pulseValue]);

    const sizeConfig = SIZES[size];
    const containerSize = scale(sizeConfig.container);
    const avatarColor = AVATAR_COLORS[avatar] || colors.primary;
    const avatarIconName = AVATAR_CHARACTERS[avatar];
    const avatarImageUri = AVATAR_IMAGE_URLS[avatar];

    useEffect(() => {
        setImageLoadFailed(false);
    }, [avatarImageUri]);

    const initials = name
        ? name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : '?';

    const containerSizeStyle: ViewStyle = {
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
    };
    const imageSizeStyle = {
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
    };

    const characterSize = scaleFont(sizeConfig.text);
    const textStyle: TextStyle = {
        fontSize: characterSize,
        lineHeight: characterSize + scale(4),
    };

    const auraStyle = useAnimatedStyle(() => ({
        opacity: interpolate(focusState.value, [0, 1], [0, 0.4]),
        transform: [{ scale: interpolate(focusState.value, [0, 1], [1, 1.4]) * pulseValue.value }],
        backgroundColor: avatarColor,
    }));

    const avatarAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(focusState.value, [0, 1], [1, 1.15]) }],
    }));

    const ringAnimatedStyle = useAnimatedStyle(() => ({
        opacity: focusState.value,
        borderWidth: interpolate(focusState.value, [0, 1], [0, 4]),
        transform: [{ scale: interpolate(focusState.value, [0, 1], [1, 1.05]) }],
    }));

    const avatarBackgroundStyle = useMemo(() => ({
        backgroundColor: isAddNew ? 'rgba(255,255,255,0.1)' : avatarColor,
    }), [avatarColor, isAddNew]);

    const content = (
        <View style={[containerSizeStyle, styles.containerOverflow]}>
            {/* Background Aura */}
            {!isAddNew && (
                <AnimatedRe.View
                    style={[
                        styles.aura,
                        containerSizeStyle,
                        auraStyle,
                    ]}
                />
            )}

            <AnimatedRe.View
                style={[
                    styles.container,
                    containerSizeStyle,
                    avatarBackgroundStyle,
                    avatarAnimatedStyle,
                    isSelected && styles.containerSelected,
                    style,
                ]}
            >
                {isAddNew ? (
                    <Icon
                        name="plus"
                        size={scale(sizeConfig.icon)}
                        color={isFocused ? colors.accent : 'rgba(255,255,255,0.7)'}
                    />
                ) : avatarImageUri && !imageLoadFailed ? (
                    <Image
                        source={{ uri: avatarImageUri }}
                        style={[styles.avatarImage, imageSizeStyle]}
                        resizeMode="cover"
                        onError={() => setImageLoadFailed(true)}
                    />
                ) : avatarIconName ? (
                    <Icon
                        name={avatarIconName}
                        size={scale(sizeConfig.icon)}
                        color="#F5F7FA"
                    />
                ) : (
                    <Text style={[styles.character, textStyle]}>{initials}</Text>
                )}

                {/* Inner Rim Light */}
                {!isAddNew && (
                    <View style={[styles.innerRim, containerSizeStyle]} />
                )}

                {/* Kids Badge */}
                {isKids && !isAddNew && (
                    <View
                        style={[
                            styles.kidsBadge,
                            {
                                width: scale(sizeConfig.badge),
                                height: scale(sizeConfig.badge),
                                borderRadius: scale(sizeConfig.badge / 2),
                            },
                        ]}
                    >
                        <Text style={[styles.kidsBadgeText, { fontSize: scaleFont(sizeConfig.badge * 0.5) }]}>
                            K
                        </Text>
                    </View>
                )}

                {/* Edit Overlay */}
                {showEdit && !isAddNew && (
                    <View style={styles.editOverlay}>
                        <Icon name="pencil" size={scale(sizeConfig.icon * 0.6)} color="#FFF" />
                    </View>
                )}
            </AnimatedRe.View>

            {/* Premium Focus Ring */}
            {!isAddNew && (
                <AnimatedRe.View
                    style={[
                        styles.focusRing,
                        containerSizeStyle,
                        ringAnimatedStyle,
                    ]}
                />
            )}

            {/* Selection Marker */}
            {isSelected && (
                <View style={[styles.selectionRing, containerSizeStyle]} />
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                focusable={focusable}
                hasTVPreferredFocus={hasTVPreferredFocus}
                style={styles.pressable}
            >
                {content}
            </Pressable>
        );
    }

    return content;
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    pressable: {
        // Pressable wrapper
    },
    containerOverflow: {
        overflow: 'visible',
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    containerSelected: {
        borderWidth: 3,
        borderColor: colors.accent || '#00E5FF',
    },
    aura: {
        position: 'absolute',
        borderRadius: 999,
        // Glowing aura behind the profile
    },
    innerRim: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 999,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
    },
    character: {
        color: '#FFF',
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    kidsBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFD700',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    kidsBadgeText: {
        color: '#000',
        fontWeight: '900',
    },
    editOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusRing: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'transparent',
    },
    selectionRing: {
        position: 'absolute',
        borderWidth: 4,
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'transparent',
    },
});

export default ProfileAvatar;
