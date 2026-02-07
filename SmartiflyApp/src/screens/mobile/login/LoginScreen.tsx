import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    StatusBar,
    ActivityIndicator,
    Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Components
import CustomInput from './components/CustomInput';
import ServerSelector, { Portal } from './components/ServerSelector';

// Store
import useStore from '../../../store';

// Theme imports
import {
    colors,
    spacing,
    borderRadius,
    fontFamily,
    shadows,
    Icon
} from '../../../theme';
import { logger } from '../../../config';
import { getPortals } from '../../../api/backend';

// Types
export interface LoginScreenProps {
    navigation: any;  // Provided by Stack.Navigator
}

interface FormErrors {
    username?: string;
    password?: string;
    server?: string;
    general?: string;
}



const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
    // -------------------------------------------------------------------------
    // STATE & REFS
    // -------------------------------------------------------------------------
    const insets = useSafeAreaInsets();

    // Store with aliases for compatibility
    const login = useStore((state) => state.login);
    const isLoading = useStore((state) => state.isLoading);
    const authError = useStore((state) => state.error);
    const activePortal = useStore((state) => state.selectedPortal);
    const savedPortals = useStore((state) => state.portals);
    const setActivePortal = useStore((state) => state.selectPortal);
    const setPortals = useStore((state) => state.setPortals);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const [_, setKeyboardVisible] = useState(false);

    // Server fetch state
    const [isFetchingPortals, setIsFetchingPortals] = useState(false);
    const [portalError, setPortalError] = useState<string | undefined>(undefined);

    const inputs = useRef<{ [key: string]: any }>({});
    const scrollRef = useRef<ScrollView>(null);

    // -------------------------------------------------------------------------
    // EFFECTS
    // -------------------------------------------------------------------------

    // Handle keyboard visibility
    useEffect(() => {
        const keyboardShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const keyboardHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showListener = Keyboard.addListener(keyboardShow, () => setKeyboardVisible(true));
        const hideListener = Keyboard.addListener(keyboardHide, () => setKeyboardVisible(false));

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    // Clear errors on input
    useEffect(() => {
        if (username) setErrors(prev => ({ ...prev, username: undefined }));
    }, [username]);

    useEffect(() => {
        if (password) setErrors(prev => ({ ...prev, password: undefined }));
    }, [password]);

    // Handle Auth Error from Store
    useEffect(() => {
        if (authError) {
            const errorMessage = typeof authError === 'string'
                ? authError
                : authError.message;
            setErrors(prev => ({ ...prev, general: errorMessage }));
        }
    }, [authError]);

    // Fetch portals on mount if empty
    const fetchPortals = useCallback(async () => {
        setIsFetchingPortals(true);
        setPortalError(undefined);

        try {
            logger.info('Fetching portals...');
            const portals = await getPortals();

            if (portals && Array.isArray(portals) && portals.length > 0) {
                // Validate portals have valid URLs
                const validPortals = portals.filter((portal: Portal) => {
                    const hasValidUrl = portal.url &&
                        typeof portal.url === 'string' &&
                        portal.url.trim() !== '';
                    if (!hasValidUrl) {
                        logger.warn(`Portal "${portal.name}" has invalid URL`);
                    }
                    return hasValidUrl;
                });

                if (validPortals.length > 0) {
                    setPortals(validPortals);

                    // Check if active portal is still valid
                    const isSelectedValid = activePortal && validPortals.some(p => p.id === activePortal.id);

                    if (!isSelectedValid) {
                        logger.info('Mobile: Selected portal invalid, switching to default');
                        setActivePortal(validPortals[0]);
                    }
                } else {
                    setPortalError('No servers with valid URLs found');
                }
            } else {
                setPortalError('No servers found');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load servers';
            logger.error('Failed to fetch portals', err);
            setPortalError(errorMessage);
        } finally {
            setIsFetchingPortals(false);
        }
    }, [activePortal, setPortals, setActivePortal]);

    // ALWAYS fetch on mount to ensure freshness
    useEffect(() => {
        fetchPortals();
    }, [fetchPortals]);

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        if (!username.trim()) {
            newErrors.username = 'Username is required';
            isValid = false;
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
            isValid = false;
        }

        if (!activePortal) {
            newErrors.server = 'Please select a server';
            isValid = false;
        }

        // Validate portal URL
        if (activePortal && (!activePortal.url || activePortal.url.trim() === '')) {
            newErrors.server = 'Selected server has an invalid URL';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleLogin = async () => {
        Keyboard.dismiss();

        if (!validateForm()) return;

        try {
            logger.info('Attempting login...', { username });
            const success = await login(username, password);
            logger.info('Login result:', success);

            if (success) {
                // Navigate to loading screen which handles prefetching
                navigation.replace('Loading');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
            logger.error('Login failed', err);
            setErrors(prev => ({
                ...prev,
                general: errorMessage
            }));
        }
    };

    const handleServerSelect = (portal: Portal) => {
        setActivePortal(portal);
        setErrors(prev => ({ ...prev, server: undefined }));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Premium Background Gradient - Fallback to Solid */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />

            {/* Ambient Glow */}
            <View style={styles.ambientGlow} />

            <View style={[styles.mainContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Header Section */}
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <View style={styles.logoWrapper}>
                                    <Image
                                        source={require('../../../assets/smartifly_icon.png')}
                                        style={styles.logoImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </View>

                            <View style={styles.textContainer}>
                                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                                <Text style={styles.welcomeSubtitle}>Sign in to your account</Text>
                            </View>
                        </View>

                        {/* Form Section - Glassmorphism Card */}
                        <View style={styles.formCard}>

                            {/* Server Selector */}
                            <Text style={styles.label}>Select Service</Text>
                            <ServerSelector
                                portals={savedPortals}
                                selectedPortal={activePortal}
                                onSelectPortal={handleServerSelect}
                                isLoading={isFetchingPortals}
                                error={portalError}
                                onRetry={fetchPortals}
                            />
                            {errors.server && <Text style={styles.errorText}>{errors.server}</Text>}

                            {/* Username Input */}
                            <View style={styles.inputSpacing}>
                                <CustomInput
                                    label="Username"
                                    leftIcon="user"
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Enter your username"
                                    error={errors.username}
                                    autoCapitalize="none"
                                    returnKeyType="next"
                                    onSubmitEditing={() => inputs.current.password?.focus()}
                                    ref={(input) => { if (input) inputs.current.username = input; }}
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputSpacing}>
                                <CustomInput
                                    label="Password"
                                    leftIcon="lock"
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    secureTextEntry
                                    showPasswordToggle
                                    error={errors.password}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                    ref={(input) => { if (input) inputs.current.password = input; }}
                                />
                            </View>

                            {/* Login Button */}
                            <TouchableOpacity
                                style={styles.loginButton}
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.gradientButton, { backgroundColor: colors.primary }]}>
                                    {isLoading ? (
                                        <ActivityIndicator color={colors.textPrimary} />
                                    ) : (
                                        <Text style={styles.loginButtonText}>SIGN IN</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* General Error Message */}
                            {errors.general && (
                                <View style={styles.generalError}>
                                    <Icon name="warning" size={20} color={colors.error} />
                                    <Text style={styles.generalErrorText}>{errors.general}</Text>
                                </View>
                            )}
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account?</Text>
                            <TouchableOpacity onPress={() => { }}>
                                <Text style={styles.footerLink}>Contact Provider</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // ... skipping ambientGlow as it uses colors.primary already
    ambientGlow: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.primary,
        opacity: 0.15,
        transform: [{ scale: 2 }],
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.xl,
        paddingTop: spacing.xxl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        marginBottom: spacing.lg,
    },
    logoWrapper: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        fontFamily: fontFamily.bold,
        letterSpacing: 0.5,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        fontFamily: fontFamily.medium,
    },
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        width: '100%',
    },
    label: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    inputSpacing: {
        marginTop: spacing.lg,
    },
    loginButton: {
        height: 56,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginTop: spacing.xl,
        ...shadows.lg,
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
    },
    gradientButton: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: fontFamily.bold,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: spacing.xs,
        marginLeft: spacing.xs,
    },
    generalError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.errorBackground,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.error,
    },
    generalErrorText: {
        color: colors.error,
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xxl,
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    footerLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    keyboardView: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
    },
});

export default LoginScreen;
