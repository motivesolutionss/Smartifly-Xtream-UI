import { Router } from 'express';
import { prisma } from '../../prisma';

const router = Router();

function normalizePortalValue(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const value = raw.trim();
    return value ? value : undefined;
}

function getPortalScope(raw: Record<string, unknown>) {
    return {
        portalIdentity: normalizePortalValue(raw.portalIdentity),
        portalBaseUrl: normalizePortalValue(raw.portalBaseUrl)
    };
}

function buildPortalWhere(portalIdentity?: string, portalBaseUrl?: string) {
    return {
        ...(portalIdentity ? { portalIdentity } : {}),
        ...(portalBaseUrl ? { portalBaseUrl } : {})
    };
}

function parseLockedCategories(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
    } catch {
        return [];
    }
}

// Track movie/series playback
router.post('/playback', async (req, res) => {
    const { movieId, type, profileId, status } = req.body;
    const { portalIdentity, portalBaseUrl } = getPortalScope(req.body as Record<string, unknown>);
    
    try {
        await prisma.playbackActivity.create({
            data: {
                movieId: String(movieId),
                type: String(type).toUpperCase(),
                profileId: String(profileId),
                status: String(status).toUpperCase(),
                portalIdentity,
                portalBaseUrl
            }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Analytics] Error saving playback:', error);
        res.status(500).json({ success: false });
    }
});

// Get trending content IDs based on cumulative view counts
router.get('/trending', async (req, res) => {
    try {
        const { portalIdentity, portalBaseUrl } = getPortalScope(req.query as Record<string, unknown>);
        const trending = await prisma.playbackActivity.groupBy({
            by: ['movieId'],
            where: {
                status: 'STARTED',
                ...buildPortalWhere(portalIdentity, portalBaseUrl)
            },
            _count: { movieId: true },
            orderBy: { _count: { movieId: 'desc' } },
            take: 20
        });
        
        res.json({
            success: true,
            data: trending.map((t: { movieId: string }) => t.movieId)
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Cloud Sync for Resume Watching
router.post('/resume', async (req, res) => {
    const { profileId, progressList } = req.body;
    if (!profileId || !Array.isArray(progressList)) return res.status(400).json({ success: false });
    
    try {
        // Bulk upsert logic
        for (const item of progressList) {
            await prisma.resumeProgress.upsert({
                where: {
                    profileId_contentId: {
                        profileId: String(profileId),
                        contentId: String(item.contentId)
                    }
                },
                update: {
                    progressMs: item.progressMs,
                    durationMs: item.durationMs,
                    lastUpdated: new Date()
                },
                create: {
                    profileId: String(profileId),
                    contentId: String(item.contentId),
                    progressMs: item.progressMs,
                    durationMs: item.durationMs
                }
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('[ResumeSync] Error:', error);
        res.status(500).json({ success: false });
    }
});

router.get('/resume/:profileId', async (req, res) => {
    const { profileId } = req.params;
    try {
        const data = await prisma.resumeProgress.findMany({
            where: { profileId: String(profileId) }
        });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Search Discovery & Suggestions
router.get('/discovery/suggestions', async (req, res) => {
    try {
        const { portalIdentity, portalBaseUrl } = getPortalScope(req.query as Record<string, unknown>);
        if (!portalIdentity && !portalBaseUrl) {
            return res.json({ success: true, data: [] });
        }

        const history = await prisma.playbackActivity.findMany({
            where: {
                status: 'STARTED',
                ...buildPortalWhere(portalIdentity, portalBaseUrl)
            },
            orderBy: { timestamp: 'desc' },
            take: 120,
            select: { movieId: true, type: true }
        });

        if (history.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const movieIds = [...new Set(history.map((item) => item.movieId))];
        const metadata = await prisma.tmdbMetadata.findMany({
            where: { contentId: { in: movieIds } },
            select: { contentId: true, title: true, genres: true }
        });

        const metadataById = new Map(metadata.map((item) => [item.contentId, item]));
        const titleCounts = new Map<string, number>();
        const genreCounts = new Map<string, number>();
        const typeCounts = new Map<string, number>();

        history.forEach((item) => {
            const normalizedType = item.type.trim().toUpperCase();
            typeCounts.set(normalizedType, (typeCounts.get(normalizedType) ?? 0) + 1);

            const meta = metadataById.get(item.movieId);
            if (meta?.title) {
                titleCounts.set(meta.title, (titleCounts.get(meta.title) ?? 0) + 1);
            }
            meta?.genres?.split(',').map((genre) => genre.trim()).filter(Boolean).forEach((genre) => {
                genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
            });
        });

        const genreSuggestions = [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre);

        const titleSuggestions = [...titleCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([title]) => title);

        const typeSuggestions = [...typeCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([type]) => {
                switch (type) {
                    case 'LIVE':
                        return 'Live Channels';
                    case 'SERIES':
                        return 'Popular Series';
                    default:
                        return 'Popular Movies';
                }
            });

        const suggestions = [...genreSuggestions, ...typeSuggestions, ...titleSuggestions]
            .filter((value, index, array) => array.indexOf(value) === index)
            .slice(0, 8);

        return res.json({ success: true, data: suggestions });
    } catch (error) {
        return res.status(500).json({ success: false, data: [] });
    }
});

// Parental Control & Privacy
router.post('/parental/validate', async (req, res) => {
    const { pin, userId } = req.body;
    const parsedUserId = Number(userId);
    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
        return res.status(400).json({ success: false, message: 'userId is required' });
    }
    try {
        const config = await prisma.parentalConfig.findUnique({
            where: { userId: parsedUserId }
        });
        
        if (!config || pin === config.pin) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Invalid PIN" });
        }
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

router.get('/parental/config', async (req, res) => {
    const userIdRaw = req.query.userId;
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) {
        return res.json({ success: true, lockedCategories: [] });
    }
    try {
        const config = await prisma.parentalConfig.findUnique({
            where: { userId }
        });

        return res.json({
            success: true,
            lockedCategories: parseLockedCategories(config?.lockedCategories)
        });
    } catch (error) {
        return res.status(500).json({ success: false, lockedCategories: [] });
    }
});

// Usage Dashboard: Get top watched content per profile
router.get('/dashboard/stats', async (req, res) => {
    const { profileId } = req.query;
    try {
        const { portalIdentity, portalBaseUrl } = getPortalScope(req.query as Record<string, unknown>);
        const topWatched = await prisma.playbackActivity.groupBy({
            by: ['movieId', 'type'],
            where: { 
                profileId: profileId ? String(profileId) : undefined,
                status: 'COMPLETED',
                ...buildPortalWhere(portalIdentity, portalBaseUrl)
            },
            _count: { movieId: true },
            orderBy: { _count: { movieId: 'desc' } },
            take: 10
        });

        // Enrich with TMDB metadata if available
        const enrichedStats = await Promise.all(topWatched.map(async (stat: { movieId: string; type: string; _count: { movieId: number } }) => {
            const meta = await prisma.tmdbMetadata.findUnique({
                where: { contentId: stat.movieId }
            });
            return {
                movieId: stat.movieId,
                type: stat.type,
                watchCount: stat._count.movieId,
                title: meta?.title || "Unknown Content",
                poster: meta?.posterPath
            };
        }));

        res.json({ success: true, data: enrichedStats });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Smart Rows: Personalized recommendations
router.get('/discovery/smart-rows', async (req, res) => {
    const { profileId } = req.query;
    try {
        const { portalIdentity, portalBaseUrl } = getPortalScope(req.query as Record<string, unknown>);
        // 1. Get user's most watched genre
        const history = await prisma.playbackActivity.findMany({
            where: {
                profileId: String(profileId),
                status: 'COMPLETED',
                ...buildPortalWhere(portalIdentity, portalBaseUrl)
            },
            take: 10
        });

        const movieIds = history.map((h: { movieId: string }) => h.movieId);
        const metadata = await prisma.tmdbMetadata.findMany({
            where: { contentId: { in: movieIds } }
        });

        // Simple genre frequency counter
        const genreMap: Record<string, number> = {};
        metadata.forEach((m: { genres: string | null }) => {
            m.genres?.split(',').forEach((g: string) => {
                genreMap[g.trim()] = (genreMap[g.trim()] || 0) + 1;
            });
        });

        const topGenre = Object.keys(genreMap).sort((a, b) => genreMap[b] - genreMap[a])[0] || "Action";

        // 2. Fetch recommendations for that genre
        const recommendations = await prisma.tmdbMetadata.findMany({
            where: { 
                genres: { contains: topGenre },
                contentId: { notIn: movieIds } // Don't recommend what they already watched
            },
            take: 10
        });

        res.json({
            success: true,
            rows: [
                {
                    title: `Because you like ${topGenre}`,
                    items: recommendations
                },
                {
                    title: "Trending on Smartifly",
                    items: await prisma.tmdbMetadata.findMany({ take: 10, orderBy: { rating: 'desc' } })
                }
            ]
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

export default router;
