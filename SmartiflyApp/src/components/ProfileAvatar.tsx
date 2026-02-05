/**
 * Profile Avatar Component
 *
 * Reusable avatar display for profile selection and editing.
 * Supports TV focus states and kids badge overlay.
 *
 * @enterprise-grade
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { AvatarId, AVATAR_COLORS } from '../store/profileStore';
import { colors, scale, scaleFont, Icon } from '../theme';

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
    const [internalFocused, setInternalFocused] = useState(false);
    const focused = isFocused || internalFocused;

    const sizeConfig = SIZES[size];
    const containerSize = scale(sizeConfig.container);
    const avatarColor = AVATAR_COLORS[avatar] || colors.primary;

    // Get initials from name
    const initials = name
        ? name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : '?';

    const containerStyle: ViewStyle = {
        width: containerSize,
        height: containerSize,
        borderRadius: containerSize / 2,
    };

    const textStyle: TextStyle = {
        fontSize: scaleFont(sizeConfig.text),
    };

    const dynamicContainerStyle = {
        backgroundColor: isAddNew ? 'rgba(255,255,255,0.1)' : avatarColor,
    };

    const kidsBadgeStyle = {
        width: scale(sizeConfig.badge),
        height: scale(sizeConfig.badge),
        borderRadius: scale(sizeConfig.badge / 2),
    };

    const kidsBadgeTextStyle = {
        fontSize: scaleFont(sizeConfig.badge * 0.5),
    };

    const handleFocus = () => setInternalFocused(true);
    const handleBlur = () => setInternalFocused(false);

    const content = (
        <View
            style={[
                styles.container,
                containerStyle,
                dynamicContainerStyle,
                focused && styles.containerFocused,
                isSelected && styles.containerSelected,
                style,
            ]}
        >
            {isAddNew ? (
                <Icon
                    name="plus"
                    size={scale(sizeConfig.icon)}
                    color={focused ? colors.accent : 'rgba(255,255,255,0.7)'}
                />
            ) : (
                <Text style={[styles.initials, textStyle]}>{initials}</Text>
            )}

            {/* Kids Badge */}
            {isKids && !isAddNew && (
                <View
                    style={[
                        styles.kidsBadge,
                        kidsBadgeStyle,
                    ]}
                >
                    <Text style={[styles.kidsBadgeText, kidsBadgeTextStyle]}>
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

            {/* Focus Ring */}
            {focused && <View style={[styles.focusRing, containerStyle]} />}

            {/* Selection Ring */}
            {isSelected && <View style={[styles.selectionRing, containerStyle]} />}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
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
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    containerFocused: {
        transform: [{ scale: 1.1 }],
    },
    containerSelected: {
        borderWidth: 3,
        borderColor: colors.accent || '#00E5FF',
    },
    initials: {
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
