import { Router } from 'express';
import { TmdbService } from '../../services/tmdb.service';

const router = Router();

/**
 * GET /public/content/enrich?id=123&title=Avatar&type=movie
 * Fetches or provides cached metadata for a movie/series
 */
router.get('/enrich', async (req, res) => {
    const { id, title, type } = req.query;

    if (!id || !title || !type) {
        return res.status(400).json({ success: false, message: "Missing required fields (id, title, type)" });
    }

    try {
        const metadata = await TmdbService.enrichContent(
            String(id),
            String(title),
            type === 'movie' ? 'movie' : 'series'
        );

        if (metadata) {
            res.json({
                success: true,
                data: metadata
            });
        } else {
            res.status(404).json({ success: false, message: "Metadata not found" });
        }
    } catch (error) {
        console.error('[Content.Enrich] Error:', error);
        res.status(500).json({ success: false });
    }
});

export default router;
