/**
 * Smartifly Announcements Screen
 * 
 * Displays system announcements and notifications.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavBar from '../../../components/NavBar';
import { colors, spacing, borderRadius } from '../../../theme';
import useStore from '../../../store';
import { FlashList } from '@shopify/flash-list';

const AnnouncementsScreen: React.FC<any> = () => {
    const insets = useSafeAreaInsets();
    const userInfo = useStore((state) => state.userInfo);
    const fatherControl = useStore((state) => state.fatherControl);
    const announcements = useStore((state) => state.announcements);
    const isLoading = useStore((state) => state.announcementsLoading);
    const error = useStore((state) => state.announcementsError);
    const fetchAnnouncements = useStore((state) => state.fetchAnnouncements);

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

    const refreshAnnouncements = useCallback(() => {
        fetchAnnouncements({ force: true });
    }, [fetchAnnouncements]);

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
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>{item.title}</Text>
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
                    <Text style={styles.emptyText}>{error}</Text>
                    <Text style={styles.emptyHint}>Pull to refresh</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No announcements</Text>
            </View>
        );
    }, [error, isLoading]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title="Announcements"
                username={userInfo?.username}
            />

            <FlashList
                data={normalizedAnnouncements}
                keyExtractor={keyExtractor}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + spacing.xl }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={refreshAnnouncements}
                        tintColor={colors.primary}
                    />
                }
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
        backgroundColor: colors.cardBackground,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    title: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    date: {
        color: colors.textMuted,
        fontSize: 12,
    },
    message: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textMuted,
    },
    emptyHint: {
        marginTop: spacing.xs,
        color: colors.textMuted,
        fontSize: 12,
    },
});

export default AnnouncementsScreen;
