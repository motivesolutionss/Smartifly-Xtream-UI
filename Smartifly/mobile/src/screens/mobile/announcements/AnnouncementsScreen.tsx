/**
 * Smartifly Announcements Screen
 * 
 * Displays system announcements and notifications.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavBar from '../../../components/NavBar';
import { colors, spacing, borderRadius, Icon } from '../../../theme';
import useAuthStore from '../../../store/authStore';
import useAppStatusStore from '../../../store/appStatusStore';
import { FlashList } from '@shopify/flash-list';

const MAIN_TAB_BOTTOM_SPACER = 112;

const AnnouncementsScreen: React.FC<any> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const userInfo = useAuthStore((state) => state.userInfo);
    const fatherControl = useAppStatusStore((state) => state.fatherControl);
    const announcements = useAppStatusStore((state) => state.announcements);
    const isLoading = useAppStatusStore((state) => state.announcementsLoading);
    const error = useAppStatusStore((state) => state.announcementsError);
    const fetchAnnouncements = useAppStatusStore((state) => state.fetchAnnouncements);

    const formatDate = useCallback((dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }, []);

    const sanitizeContent = useCallback((value?: string) => {
        if (!value) return '';
        return value
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const combinedData = useMemo(() => {
        const list = [...announcements];
        if (Array.isArray(fatherControl.broadcasts)) {
            const officialBroadcasts = fatherControl.broadcasts.map((b: any) => ({
                id: `father-broadcast-${b.id}`,
                title: 'Global System Message',
                content: b.message,
                createdAt: b.createdAt,
                isOfficial: true,
                type: b.type,
            }));
            list.unshift(...officialBroadcasts);
        }
        return list;
    }, [announcements, fatherControl.broadcasts]);

    const normalizedAnnouncements = useMemo(() => (
        combinedData.map((item) => ({
            ...item,
            formattedDate: formatDate(item.createdAt),
            sanitizedContent: sanitizeContent(item.content),
        }))
    ), [combinedData, formatDate, sanitizeContent]);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <View style={[styles.card, item.isOfficial && styles.cardOfficial]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {item.isOfficial && (
                        <View style={styles.officialBadge}>
                            <Icon name="infoCircle" size={12} color={colors.textPrimary} />
                            <Text style={styles.officialBadgeText}>OFFICIAL</Text>
                        </View>
                    )}
                    <Text style={styles.title}>{item.title}</Text>
                </View>
                <Text style={styles.date}>{item.formattedDate}</Text>
            </View>
            <Text style={styles.message}>{item.sanitizedContent}</Text>
        </View>
    ), []);

    const keyExtractor = useCallback((item: any) => String(item.id), []);

    const listEmpty = useMemo(() => {
        if (isLoading) {
            return (
                <View style={styles.emptyState}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconWrap}>
                        <Icon name="warning" size={20} color={colors.warning} />
                    </View>
                    <Text style={styles.emptyTitle}>Could not load updates</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                    <Icon name="bell" size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No announcements yet</Text>
                <Text style={styles.emptyText}>System updates and important notices will appear here.</Text>
            </View>
        );
    }, [error, isLoading]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title="Announcements"
                username={userInfo?.username}
                showSearch
                onSearchPress={() => navigation.navigate('Search')}
            />

            <FlashList
                data={normalizedAnnouncements}
                keyExtractor={keyExtractor}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER }
                ]}
                renderItem={renderItem}
                ListEmptyComponent={listEmpty}
                // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                estimatedItemSize={140}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        padding: spacing.md,
    },
    card: {
        backgroundColor: colors.backgroundSecondary,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    cardOfficial: {
        borderColor: 'rgba(229, 9, 20, 0.45)',
        backgroundColor: 'rgba(229, 9, 20, 0.06)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    headerLeft: {
        flex: 1,
        gap: spacing.xs,
    },
    officialBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.xs,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    officialBadgeText: {
        color: colors.textPrimary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 21,
    },
    date: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    message: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 21,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
        marginTop: spacing.xl,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    emptyText: {
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default AnnouncementsScreen;
