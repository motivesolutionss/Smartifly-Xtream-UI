/**
 * TV Profile Switcher Screen
 *
 * "Who's Watching?" screen shown after login.
 * Netflix-style profile selection grid with cinematic UI.
 *
 * @enterprise-grade
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Animated,
    Image,
    Pressable,
} from 'react-native';
import { useProfileStore, UserProfile } from '../../../store/profileStore';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { colors, scale, scaleFont, TV_SAFE_AREA } from '../../../theme';
import { logger } from '../../../config';

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
    const { profiles, switchProfile, canCreateProfile } = useProfileStore();
    const [isEditMode, setIsEditMode] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(scale(50))).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    // Prepare profile list data
    const data: ProfileItem[] = [
        ...profiles.map((profile) => ({ type: 'profile' as const, profile })),
        ...(canCreateProfile() ? [{ type: 'add' as const }] : []),
    ];

    const handleProfileSelect = (profile: UserProfile) => {
        if (isEditMode) {
            // Go to editor
            navigation.navigate('ProfileEditor', { profileId: profile.id });
            return;
        }

        if (profile.pinRequired) {
            // Go to PIN entry
            navigation.navigate('PinEntry', {
                profileId: profile.id,
                returnTo: 'Home',
            });
            return;
        }

        // Direct switch
        const success = switchProfile(profile.id);
        if (success) {
            logger.info('Profile switched', { profileId: profile.id });
            navigation.replace('Home');
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

        if (item.type === 'add') {
            return (
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
            );
        }

        const profile = item.profile!;

        return (
            <Pressable
                onPress={() => handleProfileSelect(profile)}
                onFocus={() => setFocusedIndex(index)}
                style={styles.profileItem}
                focusable
                hasTVPreferredFocus={index === 0}
            >
                <ProfileAvatar
                    avatar={profile.avatar}
                    name={profile.name}
                    isKids={profile.isKidsProfile}
                    showEdit={isEditMode}
                    size="xlarge"
                    isFocused={isFocused}
                />
                <Text style={[styles.profileName, isFocused && styles.profileNameFocused]}>
                    {profile.name}
                </Text>
                {profile.pinRequired && !isEditMode && (
                    <View style={styles.lockBadge}>
                        <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Cinematic Background */}
            <Image
                source={require('../../../assets/overlay.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.darkOverlay} />

            {/* Content */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Header */}
                <Text style={styles.title}>Who's Watching?</Text>

                {/* Profile Grid */}
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) =>
                        item.type === 'add' ? 'add_profile' : item.profile!.id
                    }
                    horizontal
                    contentContainerStyle={styles.profileList}
                    showsHorizontalScrollIndicator={false}
                />

                {/* Edit Mode Toggle */}
                <Pressable
                    onPress={toggleEditMode}
                    onFocus={() => setFocusedIndex(-1)}
                    style={() => [
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
            </Animated.View>
        </View>
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
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: TV_SAFE_AREA.title.horizontal,
    },
    title: {
        fontSize: scaleFont(42),
        color: '#FFF',
        fontWeight: '700',
        marginBottom: scale(60),
        letterSpacing: 1,
    },
    profileList: {
        paddingHorizontal: scale(40),
        gap: scale(40),
    },
    profileItem: {
        alignItems: 'center',
        marginHorizontal: scale(20),
    },
    profileName: {
        marginTop: scale(16),
        fontSize: scaleFont(18),
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
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
        marginTop: scale(50),
        paddingVertical: scale(12),
        paddingHorizontal: scale(30),
        borderRadius: scale(8),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    editButtonFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: colors.accent || '#00E5FF',
    },
    editButtonText: {
        fontSize: scaleFont(16),
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
        letterSpacing: 1,
    },
    editButtonTextFocused: {
        color: '#FFF',
    },
});

export default TVProfileSwitcher;
