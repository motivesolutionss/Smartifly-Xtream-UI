/**
 * TV Profile Switcher Screen
 *
 * "Who's Watching?" screen shown after login.
 * Netflix-style profile selection grid with cinematic UI.
 *
 * @enterprise-grade
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Pressable,
} from 'react-native';
import { useProfileStore, UserProfile } from '@smartifly/shared/src/store/profileStore';
import { useAuthStore } from '@smartifly/shared/src/store/authStore';
import ProfileAvatar from '../../components/tv/TVProfileAvatar';
import { scale, scaleFont, TV_SAFE_AREA } from '../../theme';
import { logger } from '../../config';
import AnimatedRe, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    interpolate,
} from 'react-native-reanimated';

// =============================================================================
// TYPES
// =============================================================================

interface ProfileItem {
    type: 'profile' | 'add';
    profile?: UserProfile;
}

interface TVProfileSwitcherProps {
    navigation: any;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVProfileSwitcher: React.FC<TVProfileSwitcherProps> = ({ navigation }) => {
    const { profiles, switchProfile, canCreateProfile, syncMainProfileName } = useProfileStore();
    const { userInfo } = useAuthStore();
    const [isEditMode, setIsEditMode] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);

    // Shared values for 3D parallax and entry
    const tiltX = useSharedValue(0);
    const tiltY = useSharedValue(0);
    const entryProgress = useSharedValue(0);

    // Sync profile name on mount for existing users
    useEffect(() => {
        if (userInfo?.username) {
            syncMainProfileName(userInfo.username);
        }
    }, [userInfo?.username, syncMainProfileName]);

    useEffect(() => {
        // Entrance sequence
        entryProgress.value = withTiming(1, { duration: 1000 });
    }, [entryProgress]);

    useEffect(() => {
        // Update tilt based on focused index
        const totalItems = profiles.length + (canCreateProfile() ? 1 : 0);
        if (focusedIndex === -1) {
            // Focus on Manage button (bottom)
            tiltX.value = withSpring(8, { damping: 15 });
            tiltY.value = withSpring(0, { damping: 15 });
        } else {
            const midpoint = (totalItems - 1) / 2;
            const targetY = (focusedIndex - midpoint) * -5; // Horizontal tilt
            tiltX.value = withSpring(-5, { damping: 15 }); // Subtle vertical tilt
            tiltY.value = withSpring(targetY, { damping: 15 });
        }
    }, [focusedIndex, profiles.length, canCreateProfile, tiltX, tiltY]);

    // Background Animated Styles
    const backgroundStyle = useAnimatedStyle(() => ({
        transform: [
            { perspective: 1000 },
            { rotateX: `${tiltX.value}deg` },
            { rotateY: `${tiltY.value}deg` },
            { scale: 1.15 }, // Over-scale to avoid edges showing during tilt
        ],
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: entryProgress.value,
        transform: [{ translateY: interpolate(entryProgress.value, [0, 1], [40, 0]) }],
    }));

    // Prepare profile list data
    const data: ProfileItem[] = [
        ...profiles.map((profile) => ({ type: 'profile' as const, profile })),
        ...(canCreateProfile() ? [{ type: 'add' as const }] : []),
    ];

    const handleProfileSelect = (profile: UserProfile) => {
        if (isEditMode) {
            navigation.navigate('ProfileEditor', { profileId: profile.id });
            return;
        }

        if (profile.pinRequired) {
            navigation.navigate('PinEntry', {
                profileId: profile.id,
                returnTo: 'TVShell',
            });
            return;
        }

        const success = switchProfile(profile.id);
        if (success) {
            logger.info('Profile switched', { profileId: profile.id });
            navigation.replace('TVShell');
        }
    };

    const handleAddProfile = () => {
        navigation.navigate('ProfileEditor', { profileId: undefined });
    };

    const toggleEditMode = () => {
        setIsEditMode((prev) => !prev);
    };

    const renderItem = ({ item, index }: { item: ProfileItem; index: number }) => {
        const isFocused = focusedIndex === index;

        const profileContent = item.type === 'add' ? (
            <Pressable
                onPress={handleAddProfile}
                onFocus={() => setFocusedIndex(index)}
                style={styles.profileItem}
                focusable
            >
                <ProfileAvatar
                    avatar="avatar_01"
                    isAddNew
                    size="xlarge"
                    isFocused={isFocused}
                />
                <Text style={[styles.profileName, isFocused && styles.profileNameFocused]}>
                    Add Profile
                </Text>
            </Pressable>
        ) : (
            <Pressable
                onPress={() => handleProfileSelect(item.profile!)}
                onFocus={() => setFocusedIndex(index)}
                style={styles.profileItem}
                focusable
                hasTVPreferredFocus={index === 0}
            >
                <ProfileAvatar
                    avatar={item.profile!.avatar}
                    name={item.profile!.name}
                    isKids={item.profile!.isKidsProfile}
                    showEdit={isEditMode}
                    size="xlarge"
                    isFocused={isFocused}
                />
                <Text style={[styles.profileName, isFocused && styles.profileNameFocused]}>
                    {item.profile!.name}
                </Text>
                {item.profile!.pinRequired && !isEditMode && (
                    <View style={styles.lockBadge}>
                        <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                )}
            </Pressable>
        );

        return (
            <ProfileCardWrapper index={index} key={item.type === 'add' ? 'add' : item.profile!.id}>
                {profileContent}
            </ProfileCardWrapper>
        );
    };

    return (
        <View style={styles.container}>
            {/* Cinematic Background */}
            <AnimatedRe.View style={[styles.backgroundContainer, backgroundStyle]}>
                <Image
                    source={require('../../assets/overlay.png')}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                />
                <View style={styles.vignette} />
            </AnimatedRe.View>

            <View style={styles.darkOverlay} />

            {/* Content */}
            <AnimatedRe.View style={[styles.content, contentStyle]}>
                {/* Header */}
                <Text style={styles.title}>Who's Watching?</Text>

                {/* Profile Grid */}
                <View style={styles.listWrapper}>
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={(item) =>
                            item.type === 'add' ? 'add_profile' : item.profile!.id
                        }
                        horizontal
                        style={styles.flatList}
                        contentContainerStyle={styles.profileList}
                        showsHorizontalScrollIndicator={false}
                        scrollEnabled={false}
                        removeClippedSubviews={false}
                    />
                </View>

                {/* Edit Mode Toggle */}
                <Pressable
                    onPress={toggleEditMode}
                    onFocus={() => setFocusedIndex(-1)}
                    style={[
                        styles.editButton,
                        focusedIndex === -1 && styles.editButtonFocused,
                    ]}
                    focusable
                >
                    <Text
                        style={[
                            styles.editButtonText,
                            focusedIndex === -1 && styles.editButtonTextFocused,
                        ]}
                    >
                        {isEditMode ? 'Done' : 'Manage Profiles'}
                    </Text>
                </Pressable>
            </AnimatedRe.View>
        </View>
    );
};

/**
 * Animated wrapper for profile cards to handle entry stagger
 */
const ProfileCardWrapper: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        const delay = index * 100 + 300;
        opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 100 }));
    }, [index, opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
        overflow: 'visible',
    }));

    return (
        <AnimatedRe.View style={animatedStyle}>
            {children}
        </AnimatedRe.View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    vignette: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: TV_SAFE_AREA.title.horizontal,
    },
    title: {
        fontSize: scaleFont(44),
        color: '#FFF',
        fontWeight: '600',
        marginBottom: scale(50),
        letterSpacing: 0.5,
    },
    profileList: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(40),
        paddingVertical: scale(60), // Vertical buffer for unclipped focus zoom/aura
        gap: scale(60),
        overflow: 'visible',
    },
    flatList: {
        overflow: 'visible',
        width: '100%',
    },
    listWrapper: {
        width: '100%',
        height: scale(380),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    profileItem: {
        alignItems: 'center',
        overflow: 'visible',
    },
    profileName: {
        marginTop: scale(24),
        fontSize: scaleFont(20),
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    profileNameFocused: {
        color: '#FFF',
    },
    lockBadge: {
        position: 'absolute',
        top: scale(8),
        right: scale(8),
    },
    lockIcon: {
        fontSize: scaleFont(16),
    },
    editButton: {
        marginTop: scale(60),
        paddingVertical: scale(12),
        paddingHorizontal: scale(36),
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: scale(4),
    },
    editButtonFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: '#FFF',
    },
    editButtonText: {
        fontSize: scaleFont(18),
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '500',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    editButtonTextFocused: {
        color: '#FFF',
    },
});

export default TVProfileSwitcher;
