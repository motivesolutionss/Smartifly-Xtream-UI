/**
 * Smartifly Premium Login Screen
 * 
 * A modern, professional login experience with:
 * - Refined branding and logo
 * - Server selector with status indicators
 * - Modern inputs with icons and validation
 * - Password visibility toggle
 * - Remember me checkbox
 * - Premium styled button with loading state
 * - Inline error messages
 * - Keyboard aware scrolling
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator,
    StatusBar,
    Dimensions,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import CustomInput from './components/CustomInput';
import ServerSelector, { Portal } from './components/ServerSelector';
import Checkbox from './components/Checkbox';

// Store & API imports
import useStore from '../../../store';
// import { getPortals } from '../../../api/backend';

// Theme imports
import {
    colors,
    spacing,
    borderRadius,
    typography,
    screen,
    shadows,
    glowEffects,
} from '../../../theme';
import { logger } from '../../../config';

// Use mobile typography
const typo = typography.mobile;

// =============================================================================
// TYPES
// =============================================================================

interface LoginScreenProps {
    navigation: any;
}

interface FormErrors {
    username?: string;
    password?: string;
    general?: string;
}

// =============================================================================
// MOCK DATA (Remove when integrating with real store)
// =============================================================================

// MOCK DATA REMOVED - Using backend API via store

// =============================================================================
// LOGIN SCREEN COMPONENT
// =============================================================================

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    // UI state
    // Store state
    const {
        portals,
        isLoading,
        error: storeError,
        login,
        selectPortal,
        selectedPortal
    } = useStore();

    // Refs
    const passwordInputRef = useRef<any>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Load portals on mount
    useEffect(() => {
        loadSavedCredentials();
    }, []);

    // Fetch portals from backend
    // fetchPortals is now handled by store

    // Load saved credentials if remember me was enabled
    const loadSavedCredentials = async () => {
        try {
            // Replace with AsyncStorage implementation:
            // const savedUsername = await AsyncStorage.getItem('saved_username');
            // const savedPassword = await AsyncStorage.getItem('saved_password');
            // if (savedUsername) setUsername(savedUsername);
            // if (savedPassword) setPassword(savedPassword);
            // setRememberMe(true);
        } catch (err) {
            logger.error('Failed to load saved credentials', err);
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!username.trim()) {
            newErrors.username = 'Username is required';
        } else if (username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 4) {
            newErrors.password = 'Password must be at least 4 characters';
        }

        if (!selectedPortal) {
            newErrors.general = 'Please select a server';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle login
    const handleLogin = async () => {
        Keyboard.dismiss();

        if (!validateForm()) {
            return;
        }

        setErrors({});

        try {
            // Store login action handles authentication
            const success = await login(username, password);

            if (success) {
                // Save credentials if remember me is checked
                if (rememberMe) {
                    // await AsyncStorage.setItem('saved_username', username);
                    // await AsyncStorage.setItem('saved_password', password);
                }

                // Navigate to loading screen for content prefetch
                navigation.replace('Loading');
            } else {
                // Error is handled by store but we can show generic message if needed
                // console.log('Login failed', useStore.getState().error);
            }
        } catch (err: any) {
            setErrors({
                general: err?.message || 'Login failed. Please try again.'
            });
        }
    };

    // Clear field error when user types
    const handleUsernameChange = (text: string) => {
        setUsername(text);
        if (errors.username) {
            setErrors(prev => ({ ...prev, username: undefined }));
        }
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (errors.password) {
            setErrors(prev => ({ ...prev, password: undefined }));
        }
    };

    // Check server status (optional feature)
    const checkServerStatus = async (portal: Portal) => {
        try {
            // Simulate ping check
            await new Promise<void>(resolve => setTimeout(() => resolve(), Math.random() * 1000 + 500));
            const latency = Math.floor(Math.random() * 150) + 20;
            return {
                id: portal.id,
                status: 'online' as const,
                latency,
            };
        } catch {
            return {
                id: portal.id,
                status: 'offline' as const,
            };
        }
    };

    // Determine if form is valid for submission
    const isFormValid = username.trim().length > 0 &&
        password.trim().length > 0 &&
        selectedPortal !== null;

    // DEBUG: SAFE RENDER
    return (
        <View style={{ flex: 1, backgroundColor: 'blue', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Login Screen Safe Render</Text>
            <Text style={{ color: 'white', marginTop: 20 }}>If you see this, imports are OK.</Text>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },

    // Logo Section
    logoSection: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logoMark: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.base,
    },
    logoImage: {
        width: 100,
        height: 100,
    },
    logoText: {
        ...typo.logo,
        color: colors.textPrimary,
        letterSpacing: 6,
    },
    tagline: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: spacing.xs,
        letterSpacing: 2,
    },
    versionBadge: {
        marginTop: spacing.md,
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    versionText: {
        ...typo.captionSmall,
        color: colors.textMuted,
        fontWeight: '600',
        letterSpacing: 1,
    },

    // Card
    card: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.cardHover,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    headerAccent: {
        width: 4,
        height: 28,
        backgroundColor: colors.accent,
        borderRadius: borderRadius.sm,
        marginRight: spacing.md,
    },
    cardTitle: {
        ...typo.h1,
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },

    // Error Banner
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorBackground,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.error,
    },
    errorBannerIcon: {
        fontSize: 18,
        marginRight: spacing.sm,
    },
    errorBannerText: {
        flex: 1,
        ...typo.bodySmall,
        color: colors.error,
        fontWeight: '500',
    },

    // Options Row
    optionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    forgotLink: {
        padding: spacing.xs,
    },
    forgotText: {
        ...typo.caption,
        color: colors.accent,
        fontWeight: '500',
    },

    // Login Button
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.base,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        ...shadows.md,
        shadowColor: colors.primary,
        shadowOpacity: 0.3, // slight override for colored shadow
    },
    loginButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
        elevation: 0,
    },
    loadingContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginButtonText: {
        ...typo.button,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },

    // Footer
    footer: {
        alignItems: 'center',
        marginTop: spacing['3xl'],
        paddingBottom: spacing.lg,
    },
    footerDivider: {
        width: 40,
        height: 3,
        backgroundColor: colors.border,
        borderRadius: borderRadius.xs,
        marginBottom: spacing.md,
    },
    footerText: {
        ...typo.caption,
        color: colors.textMuted,
        letterSpacing: 1,
    },
    footerSubtext: {
        ...typo.captionSmall,
        color: colors.textMuted,
        marginTop: spacing.xxs,
        opacity: 0.7,
    },
});

export default LoginScreen;
