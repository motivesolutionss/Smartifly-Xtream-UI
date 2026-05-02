/**
 * Smartifly TV Server Selector Component - Clean Edition
 * 
 * TV-optimized server picker with:
 * - Horizontal scrolling server cards
 * - Focus states with glow effects
 * - Status indicators (online/offline)
 * - Loading and error states
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Animated,
} from 'react-native';
import {
    colors,
    Icon,
    scale,
    scaleFont,
} from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

export interface Portal {
    id: string;
    name: string;
    url: string;
}

export interface ServerStatus {
    id: string;
    status: 'online' | 'offline' | 'checking' | 'unknown';
    latency?: number;
}

export interface TVServerSelectorProps {
    portals: Portal[];
    selectedPortal: Portal | null;
    onSelectPortal: (portal: Portal) => void;
    isLoading?: boolean;
    error?: string;
    checkServerStatus?: (portal: Portal) => Promise<ServerStatus>;
    onRetry?: () => void;
}

// =============================================================================
// STATUS INDICATOR COMPONENT
// =============================================================================

interface StatusIndicatorProps {
    status: ServerStatus['status'];
    latency?: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, latency }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (status === 'checking') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [status, pulseAnim]);

    const getStatusColor = () => {
        switch (status) {
            case 'online': return '#10B981';
            case 'offline': return '#EF4444';
            case 'checking': return '#F59E0B';
            default: return 'rgba(255, 255, 255, 0.3)';
        }
    };

    const getStatusText = () => {
        if (status === 'checking') return 'Checking...';
        if (status === 'offline') return 'Offline';
        if (status === 'online' && latency) return `${latency}ms`;
        return status === 'online' ? 'Online' : '';
    };

    if (status === 'unknown') return null;

    return (
        <View style={styles.statusContainer}>
            <Animated.View
                style={[
                    styles.statusDot,
                    {
                        backgroundColor: getStatusColor(),
                        transform: status === 'checking' ? [{ scale: pulseAnim }] : [],
                    },
                ]}
            />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
            </Text>
        </View>
    );
};

// =============================================================================
// SERVER CARD COMPONENT
// =============================================================================

interface ServerCardProps {
    portal: Portal;
    isSelected: boolean;
    onSelect: () => void;
    status?: ServerStatus;
    cardSize: ServerCardSize;
    hasInitialFocus?: boolean;
}

type ServerCardSize = 'solo' | 'standard' | 'compact';

interface PortalRowItem {
    index: number;
    portal: Portal;
}

interface PortalRowSpec {
    items: PortalRowItem[];
    widthFraction: number;
}

const buildPortalRows = (portals: Portal[]): PortalRowSpec[] => {
    const items = portals.map((portal, index) => ({ index, portal }));
    switch (items.length) {
        case 0:
            return [];
        case 1:
            return [{ items, widthFraction: 0.46 }];
        case 2:
            return [{ items, widthFraction: 0.74 }];
        case 3:
            return [{ items, widthFraction: 1 }];
        case 4:
            return [
                { items: items.slice(0, 2), widthFraction: 0.76 },
                { items: items.slice(2), widthFraction: 0.76 },
            ];
        default:
            return [
                { items: items.slice(0, 3), widthFraction: 1 },
                { items: items.slice(3), widthFraction: 0.72 },
            ];
    }
};

const resolveCardSize = (portalCount: number): ServerCardSize => {
    if (portalCount <= 1) return 'solo';
    if (portalCount >= 5) return 'compact';
    return 'standard';
};

const portalSubtitle = (portal: Portal, status?: ServerStatus, selected?: boolean): string => {
    if (status?.status === 'checking') return 'Checking service health...';
    if (status?.status === 'offline') return 'Service unavailable';
    if (status?.status === 'online' && selected) return 'Selected service is ready';
    if (status?.status === 'online' && status.latency) return `${status.latency} ms response`;
    if (status?.status === 'online') return 'Ready to connect';
    if (selected) return 'Selected service';
    if (portal.name.trim().length === 0) return 'Smartifly service';
    return 'Secure portal';
};

const ServerCard: React.FC<ServerCardProps> = React.memo(({
    portal,
    isSelected,
    onSelect,
    status,
    cardSize,
    hasInitialFocus = false,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const animateFocus = useCallback((focused: boolean) => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: focused ? 1.04 : 1,
                tension: 90,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
                toValue: focused ? 1 : 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleAnim, glowAnim]);

    const handleFocus = () => {
        setIsFocused(true);
        animateFocus(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        animateFocus(false);
    };

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.7],
    });

    const accentColor = colors.accent || '#00E5FF';
    const isCompact = cardSize === 'compact';
    const isSolo = cardSize === 'solo';

    const cardHeight = isSolo ? scale(140) : isCompact ? scale(96) : scale(116);
    const cardRadius = isSolo ? scale(24) : isCompact ? scale(16) : scale(20);
    const iconSize = isSolo ? scale(70) : isCompact ? scale(50) : scale(62);
    const iconRadius = isSolo ? scale(20) : isCompact ? scale(12) : scale(16);
    const iconGlyph = isSolo ? scale(32) : isCompact ? scale(24) : scale(30);
    const badgeSize = isSolo ? scale(40) : isCompact ? scale(30) : scale(36);
    const badgeGlyph = isSolo ? scale(22) : isCompact ? scale(14) : scale(18);
    const titleSize = isSolo ? scaleFont(24) : isCompact ? scaleFont(16) : scaleFont(19);
    const subtitleSize = isSolo ? scaleFont(14) : isCompact ? scaleFont(11) : scaleFont(13);

    return (
        <Animated.View
            style={[
                styles.cardWrapper,
                { transform: [{ scale: scaleAnim }] },
            ]}
        >
            {/* Glow Effect */}
            {(isFocused || isSelected) && (
                <Animated.View
                    style={[
                        styles.cardGlow,
                        isFocused ? { opacity: glowOpacity } : styles.glowOpacityUnfocused,
                        {
                            shadowColor: accentColor,
                        },
                    ]}
                />
            )}

            <Pressable
                style={[
                    styles.card,
                    isSelected && styles.cardSelected,
                    isFocused && styles.cardFocused,
                    {
                        minHeight: cardHeight,
                        borderRadius: cardRadius,
                        paddingHorizontal: isCompact ? scale(16) : scale(20),
                        paddingVertical: isCompact ? scale(14) : scale(18),
                        minWidth: isSolo ? scale(560) : isCompact ? scale(250) : scale(310),
                    },
                ]}
                onPress={onSelect}
                onFocus={handleFocus}
                onBlur={handleBlur}
                accessibilityLabel={`Select server ${portal.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                hasTVPreferredFocus={hasInitialFocus}
                focusable={true}
            >
                {(isFocused || isSelected) && <View style={styles.focusTopLine} />}
                {/* Server Icon */}
                <View style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerSelected,
                    {
                        width: iconSize,
                        height: iconSize,
                        borderRadius: iconRadius,
                        marginRight: isCompact ? scale(14) : scale(18),
                    },
                ]}>
                    <Icon
                        name="server"
                        size={iconGlyph}
                        color={isSelected ? '#000' : accentColor}
                    />
                </View>

                {/* Server Info */}
                <View style={styles.cardContent}>
                    <Text
                        style={[
                            styles.serverName,
                            isSelected && styles.serverNameSelected,
                            { fontSize: titleSize },
                        ]}
                        numberOfLines={1}
                    >
                        {portal.name}
                    </Text>
                    <Text style={[styles.serverSubtitle, { fontSize: subtitleSize }]}>
                        {portalSubtitle(portal, status, isSelected)}
                    </Text>
                    {status && <StatusIndicator status={status.status} latency={status.latency} />}
                </View>

                {/* Selection Badge */}
                {isSelected && (
                    <View
                        style={[
                            styles.selectedBadge,
                            {
                                width: badgeSize,
                                height: badgeSize,
                                borderRadius: badgeSize / 2,
                            },
                        ]}
                    >
                        <Icon name="check" size={badgeGlyph} color="#000" weight="bold" />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const TVServerSelector: React.FC<TVServerSelectorProps> = ({
    portals,
    selectedPortal,
    onSelectPortal,
    isLoading,
    error,
    checkServerStatus,
    onRetry,
}) => {
    const [serverStatuses, setServerStatuses] = useState<Map<string, ServerStatus>>(new Map());
    const [retryFocused, setRetryFocused] = useState(false);
    const portalRows = useMemo(() => buildPortalRows(portals), [portals]);
    const cardSize = useMemo(() => resolveCardSize(portals.length), [portals.length]);
    const denseLayout = portals.length >= 4;

    const checkAllServers = useCallback(async () => {
        if (!checkServerStatus) return;

        const checkingStatuses = new Map<string, ServerStatus>();
        portals.forEach(portal => {
            checkingStatuses.set(portal.id, { id: portal.id, status: 'checking' });
        });
        setServerStatuses(checkingStatuses);

        for (const portal of portals) {
            try {
                const status = await checkServerStatus(portal);
                setServerStatuses(prev => new Map(prev).set(portal.id, status));
            } catch {
                setServerStatuses(prev => new Map(prev).set(portal.id, {
                    id: portal.id,
                    status: 'offline',
                }));
            }
        }
    }, [checkServerStatus, portals]);

    // Check server statuses on mount
    React.useEffect(() => {
        if (checkServerStatus && portals.length > 0) {
            checkAllServers();
        }
    }, [checkServerStatus, portals.length, checkAllServers]);

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.label}>Select Service</Text>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent || '#00E5FF'} />
                    <Text style={styles.loadingText}>Loading servers...</Text>
                </View>
            </View>
        );
    }

    // Error state
    if (error || portals.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.label}>Select Service</Text>
                <View style={styles.errorContainer}>
                    <Icon name="warning" size={scale(32)} color="#EF4444" />
                    <Text style={styles.errorText}>{error || 'No servers available'}</Text>
                    {onRetry && (
                        <Pressable
                            style={[
                                styles.retryButton,
                                retryFocused && styles.retryButtonFocused,
                            ]}
                            onPress={onRetry}
                            focusable
                            hasTVPreferredFocus
                            onFocus={() => setRetryFocused(true)}
                            onBlur={() => setRetryFocused(false)}
                        >
                            <Icon name="refresh" size={scale(20)} color={colors.accent || '#00E5FF'} />
                            <Text style={styles.retryText}>Retry</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.labelRow}>
                    <View style={styles.labelAccent} />
                    <Text style={styles.label}>SELECT SERVICE</Text>
                </View>
                <Text style={styles.countText}>
                    {portals.length} server{portals.length !== 1 ? 's' : ''} available
                </Text>
            </View>

            <View style={[styles.cardsContainer, denseLayout && styles.cardsContainerDense]}>
                {portalRows.map((row, rowIndex) => (
                    <View
                        key={`row-${rowIndex}`}
                        style={[
                            styles.row,
                            { width: `${row.widthFraction * 100}%` },
                            denseLayout ? styles.rowDense : styles.rowStandard,
                        ]}
                    >
                        {row.items.map((item) => (
                            <View key={item.portal.id} style={styles.rowItem}>
                                <ServerCard
                                    portal={item.portal}
                                    isSelected={selectedPortal?.id === item.portal.id}
                                    onSelect={() => onSelectPortal(item.portal)}
                                    status={serverStatuses.get(item.portal.id)}
                                    cardSize={cardSize}
                                    hasInitialFocus={
                                        selectedPortal
                                            ? selectedPortal.id === item.portal.id
                                            : item.index === 0
                                    }
                                />
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </View>
    );
};

// =============================================================================
// STYLES (Consolidated)
// =============================================================================

const styles = StyleSheet.create({
    // Container
    container: {
        marginBottom: scale(28),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(18),
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    labelAccent: {
        width: scale(3),
        height: scale(16),
        backgroundColor: colors.accent || '#00E5FF',
        marginRight: scale(12),
        borderRadius: scale(2),
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: scale(8),
    },
    label: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    countText: {
        fontSize: scaleFont(13),
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '600',
    },
    cardsContainer: {
        width: '100%',
        paddingVertical: scale(16),
        alignItems: 'center',
    },
    cardsContainerDense: {
        paddingVertical: scale(10),
    },
    row: {
        flexDirection: 'row',
        alignSelf: 'center',
    },
    rowStandard: {
        marginBottom: scale(14),
        gap: scale(14),
    },
    rowDense: {
        marginBottom: scale(10),
        gap: scale(10),
    },
    rowItem: {
        flex: 1,
    },

    // Card
    cardWrapper: {
        position: 'relative',
    },
    cardGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: scale(20),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: scale(30),
        elevation: 0,
    },
    glowOpacityUnfocused: {
        opacity: 0.4,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 20, 30, 0.7)',
        borderWidth: scale(2),
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    cardSelected: {
        borderColor: colors.accent || '#00E5FF',
        backgroundColor: 'rgba(0, 229, 255, 0.12)',
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: scale(20),
    },
    cardFocused: {
        borderColor: colors.accent || '#00E5FF',
    },
    iconContainer: {
        backgroundColor: 'rgba(0, 229, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerSelected: {
        backgroundColor: colors.accent || '#00E5FF',
    },
    cardContent: {
        flex: 1,
    },
    serverName: {
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.4,
    },
    serverSubtitle: {
        marginTop: scale(4),
        color: 'rgba(231, 236, 244, 0.74)',
        fontWeight: '500',
    },
    serverNameSelected: {
        color: colors.accent || '#00E5FF',
    },
    selectedBadge: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        backgroundColor: colors.accent || '#00E5FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scale(14),
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: scale(14),
        elevation: 10,
    },
    focusTopLine: {
        position: 'absolute',
        top: scale(2),
        left: '24%',
        right: '24%',
        height: scale(2),
        borderRadius: scale(2),
        backgroundColor: colors.accent || '#00E5FF',
        opacity: 0.9,
    },

    // Status Indicator
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scale(10),
    },
    statusDot: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
        marginRight: scale(8),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: scale(8),
        elevation: 4,
    },
    statusText: {
        fontSize: scaleFont(14),
        fontWeight: '600',
    },

    // Loading/Error States
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: scale(18),
        padding: scale(32),
        borderWidth: scale(1),
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    loadingText: {
        fontSize: scaleFont(18),
        color: 'rgba(255, 255, 255, 0.5)',
        marginLeft: scale(18),
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderRadius: scale(18),
        padding: scale(32),
        borderWidth: scale(1),
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        flex: 1,
        fontSize: scaleFont(18),
        color: '#FCA5A5',
        marginLeft: scale(18),
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(24),
        paddingVertical: scale(16),
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderRadius: scale(14),
        marginLeft: scale(18),
        borderWidth: scale(1),
        borderColor: colors.accent || '#00E5FF',
    },
    retryButtonFocused: {
        transform: [{ scale: 1.04 }],
        backgroundColor: 'rgba(0, 229, 255, 0.18)',
        shadowColor: colors.accent || '#00E5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: scale(18),
        elevation: 8,
    },
    retryText: {
        fontSize: scaleFont(16),
        color: colors.accent || '#00E5FF',
        fontWeight: '700',
        marginLeft: scale(10),
    },
});

export default React.memo(TVServerSelector);
