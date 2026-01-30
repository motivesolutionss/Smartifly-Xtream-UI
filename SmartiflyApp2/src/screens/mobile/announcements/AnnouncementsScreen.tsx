/**
 * Smartifly Announcements Screen
 * 
 * Displays system announcements and notifications.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NavBar from '../../../components/NavBar';
import { colors, spacing, borderRadius } from '../../../theme';
import useStore from '../../../store';
import { getAnnouncements } from '../../../api/backend';
import { logger } from '../../../config';

const AnnouncementsScreen: React.FC<any> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const userInfo = useStore((state) => state.userInfo);

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const fetchAnnouncements = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            const response = await getAnnouncements({ status: 'PUBLISHED' });
            if (Array.isArray(response)) {
                setAnnouncements(response);
            } else {
                setAnnouncements([]);
            }
        } catch (err: any) {
            logger.error('Failed to load announcements', err);
            setError(err?.message || 'Failed to load announcements');
            setAnnouncements([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

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

            <FlatList
                data={announcements}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + spacing.xl }
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={fetchAnnouncements}
                        tintColor={colors.primary}
                    />
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.message}>{sanitizeContent(item.content)}</Text>
                    </View>
                )}
                ListEmptyComponent={listEmpty}
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
