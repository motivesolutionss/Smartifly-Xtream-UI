/**
 * TV Profile Editor Screen
 *
 * Create/edit profile with avatar selection, name input, and parental controls.
 * Full TV remote navigation support.
 *
 * @enterprise-grade
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Animated,
    Alert,
    Image,
} from 'react-native';
import {
    useProfileStore,
    AVATAR_IDS,
    AVATAR_NAMES,
    CONTENT_RATINGS,
    ContentRating,
    AvatarId,
} from '@smartifly/shared/src/store/profileStore';
import ProfileAvatar from '../../components/tv/TVProfileAvatar';
import { colors, scale, scaleFont, TV_SAFE_AREA } from '../../theme';
import { logger } from '../../config';

// =============================================================================
// TYPES
// =============================================================================

interface TVProfileEditorProps {
    navigation: any;
    route: {
        params?: {
            profileId?: string;
        };
    };
}

type FocusArea = 'avatar' | 'name' | 'kids' | 'pin' | 'rating' | 'delete' | 'save' | 'cancel';

// =============================================================================
// RATING LABELS
// =============================================================================

const RATING_LABELS: Record<ContentRating, { label: string; description: string }> = {
    G: { label: 'G', description: 'General Audiences' },
    PG: { label: 'PG', description: 'Parental Guidance' },
    'PG-13': { label: 'PG-13', description: 'Parents Cautioned' },
    R: { label: 'R', description: 'Restricted' },
    'NC-17': { label: 'NC-17', description: 'Adults Only' },
    UNRATED: { label: 'All', description: 'No Restrictions' },
};

// =============================================================================
// COMPONENT
// =============================================================================

const TVProfileEditor: React.FC<TVProfileEditorProps> = ({ navigation, route }) => {
    const profileId = route.params?.profileId;
    const isEditing = !!profileId;

    const { profiles, createProfile, updateProfile, deleteProfile, getProfile, setPin, removePin } =
        useProfileStore();

    // Get existing profile if editing
    const existingProfile = isEditing ? getProfile(profileId) : undefined;

    // Form state
    const [name, setName] = useState(existingProfile?.name || '');
    const [avatar, setAvatar] = useState<AvatarId>(existingProfile?.avatar || 'avatar_01');
    const [isKidsProfile, setIsKidsProfile] = useState(existingProfile?.isKidsProfile || false);
    const [maxRating, setMaxRating] = useState<ContentRating>(
        existingProfile?.maxRating || 'NC-17'
    );
    const [pinEnabled, setPinEnabled] = useState(existingProfile?.pinRequired || false);
    const [pin, setPinValue] = useState('');

    // Focus state
    const [focusedArea, setFocusedArea] = useState<FocusArea>('name');
    const [focusedAvatarIndex, setFocusedAvatarIndex] = useState(0);
    const [focusedRatingIndex, setFocusedRatingIndex] = useState(
        CONTENT_RATINGS.indexOf(maxRating)
    );

    const nameInputRef = useRef<TextInput>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    // Enforce kids profile rating limit
    useEffect(() => {
        if (isKidsProfile) {
            const maxKidsIndex = CONTENT_RATINGS.indexOf('PG');
            const currentIndex = CONTENT_RATINGS.indexOf(maxRating);
            if (currentIndex > maxKidsIndex) {
                setMaxRating('PG');
                setFocusedRatingIndex(maxKidsIndex);
            }
        }
    }, [isKidsProfile, maxRating]);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a profile name');
            return;
        }

        const profileData = {
            name: name.trim(),
            avatar,
            isKidsProfile,
            maxRating,
            pinRequired: pinEnabled,
        };

        if (isEditing && existingProfile) {
            updateProfile(existingProfile.id, profileData);

            // Handle PIN changes
            if (pinEnabled && pin.length === 4) {
                setPin(existingProfile.id, pin);
            } else if (!pinEnabled && existingProfile.pinRequired) {
                removePin(existingProfile.id);
            }

            logger.info('Profile updated', { profileId: existingProfile.id });
        } else {
            const newProfile = createProfile(profileData);
            if (newProfile && pinEnabled && pin.length === 4) {
                setPin(newProfile.id, pin);
            }
            logger.info('Profile created', { profileId: newProfile?.id });
        }

        navigation.goBack();
    };

    const handleDelete = () => {
        if (!existingProfile) return;

        Alert.alert(
            'Delete Profile',
            `Are you sure you want to delete "${existingProfile.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteProfile(existingProfile.id);
                        logger.info('Profile deleted', { profileId: existingProfile.id });
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    // Render avatar picker
    const renderAvatarPicker = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
                {AVATAR_IDS.map((avatarId, index) => (
                    <Pressable
                        key={avatarId}
                        onFocus={() => {
                            setFocusedArea('avatar');
                            setFocusedAvatarIndex(index);
                        }}
                        onPress={() => {
                            setFocusedArea('avatar');
                            setFocusedAvatarIndex(index);
                            setAvatar(avatarId);
                        }}
                        style={styles.avatarOption}
                        focusable
                    >
                        <ProfileAvatar
                            avatar={avatarId}
                            size="medium"
                            isSelected={avatar === avatarId}
                            isFocused={focusedArea === 'avatar' && focusedAvatarIndex === index}
                            focusable={false}
                        />
                        <Text style={styles.avatarLabel}>{AVATAR_NAMES[avatarId]}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );

    // Render name input
    const renderNameInput = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Name</Text>
            <TextInput
                ref={nameInputRef}
                value={name}
                onChangeText={setName}
                style={[
                    styles.textInput,
                    focusedArea === 'name' && styles.textInputFocused,
                ]}
                placeholder="Enter name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={20}
                onFocus={() => setFocusedArea('name')}
            />
        </View>
    );

    // Render toggle
    const renderToggle = (
        label: string,
        value: boolean,
        onToggle: () => void,
        area: FocusArea,
        description?: string
    ) => (
        <Pressable
            onPress={onToggle}
            onFocus={() => setFocusedArea(area)}
            style={[styles.toggleRow, focusedArea === area && styles.toggleRowFocused]}
            focusable
        >
            <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{label}</Text>
                {description && <Text style={styles.toggleDescription}>{description}</Text>}
            </View>
            <View style={[styles.toggle, value && styles.toggleActive]}>
                <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
            </View>
        </Pressable>
    );

    // Render rating picker
    const renderRatingPicker = () => {
        const maxIndex = isKidsProfile ? CONTENT_RATINGS.indexOf('PG') : CONTENT_RATINGS.length - 1;
        const availableRatings = CONTENT_RATINGS.slice(0, maxIndex + 1);

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Content Rating Limit</Text>
                <View style={styles.ratingPicker}>
                    {availableRatings.map((rating, index) => {
                        const isSelected = maxRating === rating;
                        const isFocused = focusedArea === 'rating' && focusedRatingIndex === index;

                        return (
                            <Pressable
                                key={rating}
                                onPress={() => {
                                    setMaxRating(rating);
                                    setFocusedRatingIndex(index);
                                }}
                                onFocus={() => {
                                    setFocusedArea('rating');
                                    setFocusedRatingIndex(index);
                                }}
                                style={[
                                    styles.ratingChip,
                                    isSelected && styles.ratingChipSelected,
                                    isFocused && styles.ratingChipFocused,
                                ]}
                                focusable
                            >
                                <Text
                                    style={[
                                        styles.ratingChipText,
                                        (isSelected || isFocused) && styles.ratingChipTextSelected,
                                    ]}
                                >
                                    {RATING_LABELS[rating].label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <Text style={styles.ratingDescription}>
                    {RATING_LABELS[maxRating].description}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background */}
            <Image
                source={require('../../assets/overlay.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            <View style={styles.darkOverlay} />

            <Animated.ScrollView
                style={[styles.scrollView, { opacity: fadeAnim }]}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <Text style={styles.title}>
                    {isEditing ? 'Edit Profile' : 'Create Profile'}
                </Text>

                {/* Avatar Preview */}
                <View style={styles.avatarPreview}>
                    <ProfileAvatar
                        avatar={avatar}
                        name={name}
                        isKids={isKidsProfile}
                        size="xlarge"
                    />
                </View>

                {/* Form Sections */}
                {renderNameInput()}
                {renderAvatarPicker()}

                {renderToggle(
                    'Kids Profile',
                    isKidsProfile,
                    () => setIsKidsProfile((prev) => !prev),
                    'kids',
                    'Simplified UI with restricted content'
                )}

                {!isKidsProfile && (
                    <>
                        {renderToggle(
                            'PIN Protection',
                            pinEnabled,
                            () => setPinEnabled((prev) => !prev),
                            'pin',
                            'Require PIN to access this profile'
                        )}

                        {pinEnabled && (
                            <View style={styles.pinInputContainer}>
                                <TextInput
                                    value={pin}
                                    onChangeText={(text) =>
                                        setPinValue(text.replace(/[^0-9]/g, '').slice(0, 4))
                                    }
                                    style={styles.pinInput}
                                    placeholder="Enter 4-digit PIN"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    keyboardType="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                />
                            </View>
                        )}
                    </>
                )}

                {renderRatingPicker()}

                {/* Actions */}
                <View style={styles.actions}>
                    <Pressable
                        onPress={handleSave}
                        onFocus={() => setFocusedArea('save')}
                        style={[styles.button, styles.saveButton, focusedArea === 'save' && styles.buttonFocused]}
                        focusable
                    >
                        <Text style={styles.buttonText}>
                            {isEditing ? 'Save Changes' : 'Create Profile'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleCancel}
                        onFocus={() => setFocusedArea('cancel')}
                        style={[styles.button, styles.cancelButton, focusedArea === 'cancel' && styles.buttonFocused]}
                        focusable
                    >
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                    </Pressable>

                    {isEditing && profiles.length > 1 && (
                        <Pressable
                            onPress={handleDelete}
                            onFocus={() => setFocusedArea('delete')}
                            style={[styles.button, styles.deleteButton, focusedArea === 'delete' && styles.deleteButtonFocused]}
                            focusable
                        >
                            <Text style={styles.deleteButtonText}>Delete Profile</Text>
                        </Pressable>
                    )}
                </View>
            </Animated.ScrollView>
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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: TV_SAFE_AREA.title.horizontal,
        paddingVertical: TV_SAFE_AREA.title.vertical,
    },
    title: {
        fontSize: scaleFont(36),
        color: '#FFF',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: scale(30),
    },
    avatarPreview: {
        alignItems: 'center',
        marginBottom: scale(40),
    },
    section: {
        marginBottom: scale(30),
    },
    sectionTitle: {
        fontSize: scaleFont(18),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
        marginBottom: scale(12),
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(16),
    },
    avatarOption: {
        alignItems: 'center',
        width: scale(140),
        marginBottom: scale(14),
    },
    avatarLabel: {
        marginTop: scale(8),
        fontSize: scaleFont(12),
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(12),
        paddingHorizontal: scale(20),
        paddingVertical: scale(16),
        fontSize: scaleFont(20),
        color: '#FFF',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    textInputFocused: {
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: scale(12),
        padding: scale(20),
        marginBottom: scale(16),
        borderWidth: 2,
        borderColor: 'transparent',
    },
    toggleRowFocused: {
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    toggleInfo: {
        flex: 1,
    },
    toggleLabel: {
        fontSize: scaleFont(18),
        color: '#FFF',
        fontWeight: '600',
    },
    toggleDescription: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.5)',
        marginTop: scale(4),
    },
    toggle: {
        width: scale(60),
        height: scale(32),
        borderRadius: scale(16),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        paddingHorizontal: scale(4),
    },
    toggleActive: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    toggleThumb: {
        width: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        backgroundColor: '#FFF',
    },
    toggleThumbActive: {
        transform: [{ translateX: scale(28) }],
    },
    pinInputContainer: {
        marginBottom: scale(16),
        marginLeft: scale(20),
    },
    pinInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(8),
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        fontSize: scaleFont(18),
        color: '#FFF',
        width: scale(200),
        textAlign: 'center',
        letterSpacing: 8,
    },
    ratingPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(12),
    },
    ratingChip: {
        paddingHorizontal: scale(24),
        paddingVertical: scale(12),
        borderRadius: scale(8),
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    ratingChipSelected: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    ratingChipFocused: {
        borderColor: '#FFF',
        transform: [{ scale: 1.05 }],
    },
    ratingChipText: {
        fontSize: scaleFont(16),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    ratingChipTextSelected: {
        color: '#000',
        fontWeight: '700',
    },
    ratingDescription: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.5)',
        marginTop: scale(12),
    },
    actions: {
        marginTop: scale(40),
        gap: scale(16),
    },
    button: {
        paddingVertical: scale(18),
        paddingHorizontal: scale(40),
        borderRadius: scale(12),
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    buttonFocused: {
        transform: [{ scale: 1.02 }],
        borderWidth: 2,
        borderColor: '#FFF',
    },
    deleteButtonFocused: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    buttonText: {
        fontSize: scaleFont(18),
        color: '#000',
        fontWeight: '700',
    },
    cancelButtonText: {
        color: '#FFF',
    },
    deleteButtonText: {
        fontSize: scaleFont(16),
        color: '#EF4444',
        fontWeight: '600',
    },
});

export default TVProfileEditor;
