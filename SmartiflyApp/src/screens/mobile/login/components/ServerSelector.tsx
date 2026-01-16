/**
 * Smartifly Server Selector
 * 
 * A premium server/portal selector with:
 * - Dropdown trigger button
 * - Modal with server list
 * - Connection status indicators
 * - Server ping/latency display
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    ActivityIndicator,
    Pressable,
} from 'react-native';

// Theme imports
import {
    colors,
    spacing,
    borderRadius,
    typography,
    Icon,
} from '../../../../theme';

// Use mobile typography
const typo = typography.mobile;

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
    latency?: number; // in ms
}

export interface ServerSelectorProps {
    portals: Portal[];
    selectedPortal: Portal | null;
    onSelectPortal: (portal: Portal) => void;
    isLoading?: boolean;
    error?: string;
    /** Optional: Check server status */
    checkServerStatus?: (portal: Portal) => Promise<ServerStatus>;
    /** Optional: Retry fetching servers */
    onRetry?: () => void;
}

// =============================================================================
// STATUS INDICATOR COMPONENT
// =============================================================================

interface StatusIndicatorProps {
    status: 'online' | 'offline' | 'checking' | 'unknown';
    latency?: number;
    size?: 'small' | 'medium';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    status,
    latency,
    size = 'medium'
}) => {
    const dotSize = size === 'small' ? 8 : 10;

    const getStatusColor = () => {
        switch (status) {
            case 'online':
                return colors.success;
            case 'offline':
                return colors.error;
            case 'checking':
                return colors.warning;
            default:
                return colors.textMuted;
        }
    };

    const getStatusText = () => {
        if (status === 'checking') return 'Checking...';
        if (status === 'offline') return 'Offline';
        if (status === 'online' && latency) {
            return `${latency}ms`;
        }
        return status === 'online' ? 'Online' : 'Unknown';
    };

    if (status === 'checking') {
        return (
            <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color={colors.warning} />
            </View>
        );
    }

    return (
        <View style={styles.statusContainer}>
            <View style={[
                styles.statusDot,
                {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: getStatusColor()
                }
            ]} />
            {size === 'medium' && (
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {getStatusText()}
                </Text>
            )}
        </View>
    );
};

// =============================================================================
// SERVER ITEM COMPONENT
// =============================================================================

interface ServerItemProps {
    portal: Portal;
    isSelected: boolean;
    onSelect: () => void;
    status?: ServerStatus;
}

// Memoized for performance
const ServerItem: React.FC<ServerItemProps> = React.memo(({
    portal,
    isSelected,
    onSelect,
    status,
}) => (
    <TouchableOpacity
        style={[
            styles.serverItem,
            isSelected && styles.serverItemSelected,
        ]}
        onPress={onSelect}
        activeOpacity={0.7}
    >
        {/* Server Icon */}
        <View style={[
            styles.serverIcon,
            isSelected && styles.serverIconSelected,
        ]}>
            <Icon name="server" size={20} color={isSelected ? colors.background : colors.textMuted} />
        </View>

        {/* Server Info */}
        <View style={styles.serverInfo}>
            <Text style={[
                styles.serverName,
                isSelected && styles.serverNameSelected,
            ]}>
                {portal.name}
            </Text>
            <Text style={styles.serverUrl} numberOfLines={1}>
                {portal.url.replace(/https?:\/\//, '').replace(/\/$/, '')}
            </Text>
        </View>

        {/* Status / Selection Indicator */}
        <View style={styles.serverRight}>
            {status && (
                <StatusIndicator
                    status={status.status}
                    latency={status.latency}
                    size="medium"
                />
            )}
            {isSelected && (
                <View style={styles.checkmark}>
                    <Icon name="check" size={14} color={colors.background} weight="bold" />
                </View>
            )}
        </View>
    </TouchableOpacity>
), (prev, next) => {
    return prev.isSelected === next.isSelected &&
        prev.portal.id === next.portal.id &&
        prev.status?.status === next.status?.status &&
        prev.status?.latency === next.status?.latency;
});

// =============================================================================
// SERVER SELECTOR COMPONENT
// =============================================================================

const ServerSelector: React.FC<ServerSelectorProps> = ({
    portals,
    selectedPortal,
    onSelectPortal,
    isLoading,
    error,
    checkServerStatus,
    onRetry,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [serverStatuses, setServerStatuses] = useState<Map<string, ServerStatus>>(new Map());

    // Check all server statuses when modal opens
    useEffect(() => {
        if (modalVisible && checkServerStatus) {
            checkAllServers();
        }
    }, [modalVisible]);

    const checkAllServers = async () => {
        if (!checkServerStatus) return;

        // Set all to checking
        const checkingStatuses = new Map<string, ServerStatus>();
        portals.forEach(portal => {
            checkingStatuses.set(portal.id, { id: portal.id, status: 'checking' });
        });
        setServerStatuses(checkingStatuses);

        // Check each server
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
    };

    const handleSelectServer = (portal: Portal) => {
        onSelectPortal(portal);
        setModalVisible(false);
    };

    const openModal = () => {
        if (!isLoading && portals.length > 0) {
            setModalVisible(true);
        }
    };

    // Render loading state
    if (isLoading) {
        return (
            <View style={styles.container}>
                <Text style={styles.label}>Select Server</Text>
                <View style={styles.triggerButton}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={styles.loadingText}>Loading servers...</Text>
                </View>
            </View>
        );
    }

    // Render error state
    if (error || portals.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.label}>Select Server</Text>
                <View style={[styles.triggerButton, styles.triggerButtonError]}>
                    <Icon name="warning" size={20} color={colors.error} />
                    <Text style={styles.errorText}>
                        {error || 'No servers available'}
                    </Text>
                    {onRetry && (
                        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Select Server</Text>

            {/* Trigger Button */}
            <TouchableOpacity
                style={styles.triggerButton}
                onPress={openModal}
                activeOpacity={0.7}
            >
                <View style={styles.triggerLeft}>
                    <View style={styles.triggerIcon}>
                        <Icon name="server" size={18} color={colors.accent} />
                    </View>
                    <View style={styles.triggerInfo}>
                        <Text style={styles.triggerName}>
                            {selectedPortal?.name || 'Select a server'}
                        </Text>
                        {selectedPortal && (
                            <StatusIndicator
                                status={serverStatuses.get(selectedPortal.id)?.status || 'unknown'}
                                latency={serverStatuses.get(selectedPortal.id)?.latency}
                                size="small"
                            />
                        )}
                    </View>
                </View>
                <Icon name="chevronDown" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Server</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Refresh Button */}
                        {checkServerStatus && (
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={checkAllServers}
                            >
                                <Icon name="refresh" size={14} color={colors.accent} />
                                <Text style={styles.refreshText}>Check Status</Text>
                            </TouchableOpacity>
                        )}

                        {/* Server List */}
                        <FlatList
                            data={portals}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <ServerItem
                                    portal={item}
                                    isSelected={selectedPortal?.id === item.id}
                                    onSelect={() => handleSelectServer(item)}
                                    status={serverStatuses.get(item.id)}
                                />
                            )}
                            style={styles.serverList}
                            showsVerticalScrollIndicator={false}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <Text style={styles.footerText}>
                                {portals.length} server{portals.length !== 1 ? 's' : ''} available
                            </Text>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typo.labelSmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        letterSpacing: 0.3,
    },

    // Trigger Button
    triggerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderColor: colors.borderMedium,
        padding: spacing.md,
        minHeight: 56,
    },
    triggerButtonError: {
        borderColor: colors.error,
        backgroundColor: colors.backgroundSecondary,
    },
    triggerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    triggerIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: colors.backgroundElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    triggerIconText: {
        fontSize: 18,
    },
    triggerInfo: {
        flex: 1,
    },
    triggerName: {
        ...typo.labelLarge,
        color: colors.textPrimary,
    },
    triggerArrow: {
        fontSize: 12,
        color: colors.textMuted,
        marginLeft: spacing.sm,
    },
    loadingText: {
        ...typo.caption,
        color: colors.textMuted,
        marginLeft: spacing.sm,
    },
    errorIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    errorText: {
        flex: 1,
        ...typo.caption,
        color: colors.error,
    },
    retryButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.backgroundElevated,
        borderRadius: borderRadius.md,
    },
    retryText: {
        fontSize: 12,
        color: colors.accent,
        fontWeight: '600',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xxl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        ...typo.h3,
        color: colors.textPrimary,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: colors.textMuted,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    refreshIcon: {
        fontSize: 14,
        marginRight: spacing.xs,
    },
    refreshText: {
        fontSize: 13,
        color: colors.accent,
        fontWeight: '500',
    },
    serverList: {
        padding: spacing.md,
    },
    separator: {
        height: spacing.sm,
    },
    modalFooter: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    footerText: {
        ...typo.captionSmall,
        color: colors.textMuted,
    },

    // Server Item
    serverItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    serverItemSelected: {
        borderColor: colors.accent,
        backgroundColor: 'rgba(0, 229, 255, 0.08)',
    },
    serverIcon: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: colors.backgroundElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    serverIconSelected: {
        backgroundColor: colors.accent,
    },
    serverIconText: {
        fontSize: 20,
    },
    serverInfo: {
        flex: 1,
    },
    serverName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    serverNameSelected: {
        color: colors.accent,
    },
    serverUrl: {
        fontSize: 12,
        color: colors.textMuted,
    },
    serverRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        fontSize: 14,
        color: colors.background,
        fontWeight: '700',
    },

    // Status
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        marginRight: spacing.xs,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
});

export default React.memo(ServerSelector);