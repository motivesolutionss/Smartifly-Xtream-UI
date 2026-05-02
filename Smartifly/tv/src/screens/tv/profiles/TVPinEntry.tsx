/**
 * TV PIN Entry Screen
 *
 * Full-screen PIN entry for locked profiles.
 * Large numpad optimized for TV remote navigation.
 *
 * @enterprise-grade
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Image,
} from 'react-native';
import { useProfileStore } from '../../../store/profileStore';
import ProfileAvatar from '../../../components/tv/TVProfileAvatar';
import PinInput from '../../../components/tv/TVPinInput';
import { scale, scaleFont, TV_SAFE_AREA } from '../../../theme';
import { logger } from '../../../config';

// =============================================================================
// TYPES
// =============================================================================

interface TVPinEntryProps {
    navigation: any;
    route: {
        params: {
            profileId: string;
            returnTo: string;
        };
    };
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVPinEntry: React.FC<TVPinEntryProps> = ({ navigation, route }) => {
    const { profileId, returnTo } = route.params;
    const { getProfile, switchProfile, verifyPin } = useProfileStore();

    const profile = getProfile(profileId);
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [attempts, setAttempts] = useState(0);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
        return () => {
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current = [];
        };
    }, [fadeAnim, scaleAnim]);

    const scheduleTimeout = (callback: () => void, delay: number) => {
        const timeoutId = setTimeout(() => {
            timeoutRefs.current = timeoutRefs.current.filter((item) => item !== timeoutId);
            callback();
        }, delay);
        timeoutRefs.current.push(timeoutId);
    };

    const handlePinComplete = (pin: string) => {
        if (!profile) {
            navigation.goBack();
            return;
        }

        const isValid = verifyPin(profileId, pin);

        if (isValid) {
            const success = switchProfile(profileId, pin);
            if (success) {
                logger.info('PIN verified, switching profile', { profileId });
                navigation.replace(returnTo);
            }
        } else {
            setAttempts((prev) => prev + 1);
            setError(true);

            if (attempts >= 2) {
                setErrorMessage('Too many attempts. Try again later.');
                scheduleTimeout(() => {
                    navigation.goBack();
                }, 2000);
            } else {
                setErrorMessage('Incorrect PIN. Please try again.');
                scheduleTimeout(() => setError(false), 500);
            }

            logger.warn('Invalid PIN attempt', { profileId, attempts: attempts + 1 });
        }
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    if (!profile) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Profile not found</Text>
            </View>
        );
    }

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
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Profile Avatar */}
                <ProfileAvatar
                    avatar={profile.avatar}
                    name={profile.name}
                    isKids={profile.isKidsProfile}
                    size="xlarge"
                />

                {/* Profile Name */}
                <Text style={styles.profileName}>{profile.name}</Text>

                {/* PIN Input */}
                <View style={styles.pinContainer}>
                    <PinInput
                        onComplete={handlePinComplete}
                        error={error}
                        errorMessage={errorMessage}
                        title="Enter Profile PIN"
                        subtitle="Please enter your 4-digit PIN to continue"
                        onCancel={handleCancel}
                    />
                </View>

                {/* Forgot PIN Hint */}
                <Text style={styles.forgotHint}>
                    Forgot PIN? Go to Settings → Profiles to reset.
                </Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: TV_SAFE_AREA.title.horizontal,
    },
    profileName: {
        fontSize: scaleFont(28),
        color: '#FFF',
        fontWeight: '700',
        marginTop: scale(20),
        marginBottom: scale(40),
    },
    pinContainer: {
        marginTop: scale(20),
    },
    errorText: {
        fontSize: scaleFont(18),
        color: '#EF4444',
        textAlign: 'center',
    },
    forgotHint: {
        fontSize: scaleFont(14),
        color: 'rgba(255, 255, 255, 0.4)',
        marginTop: scale(40),
        textAlign: 'center',
    },
});

export default TVPinEntry;
