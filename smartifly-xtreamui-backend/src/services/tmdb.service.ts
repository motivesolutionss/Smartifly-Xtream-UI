import axios from 'axios';
import { prisma } from '../prisma';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'PLACEHOLDER_KEY';

export class TmdbService {
    /**
     * Enriches movie metadata by searching TMDB and caching the result
     */
    static async enrichContent(contentId: string, title: string, type: 'movie' | 'series') {
        try {
            // 1. Check Cache
            const cached = await prisma.tmdbMetadata.findUnique({
                where: { contentId }
            });

            if (cached) return cached;

            // 2. Search TMDB
            const searchType = type === 'movie' ? 'movie' : 'tv';
            const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/${searchType}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: title,
                    include_adult: true
                }
            });

            const tmdbResult = searchResponse.data.results[0];
            if (!tmdbResult) return null;

            // 3. Get Full Details (for age rating / content ratings)
            const detailsResponse = await axios.get(`${TMDB_BASE_URL}/${searchType}/${tmdbResult.id}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    append_to_response: 'release_dates,content_ratings,credits,videos'
                }
            });

            const details = detailsResponse.data;

            // 4. Extract Age Rating (Certification)
            let ageRating = 'NR'; // Not Rated
            if (type === 'movie') {
                const releases = details.release_dates?.results || [];
                const usRelease = releases.find((r: any) => r.iso_3166_1 === 'US') || releases[0];
                ageRating = usRelease?.release_dates[0]?.certification || 'NR';
            } else {
                const ratings = details.content_ratings?.results || [];
                const usRating = ratings.find((r: any) => r.iso_3166_1 === 'US') || ratings[0];
                ageRating = usRating?.rating || 'NR';
            }
            
            // 4.1 Extract Trailer (YouTube)
            const videoResults = details.videos?.results || [];
            const trailer = videoResults.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videoResults[0];
            const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

            // 5. Store in Cache
            return await prisma.tmdbMetadata.create({
                data: {
                    contentId,
                    tmdbId: details.id,
                    title: details.title || details.name,
                    overview: details.overview,
                    posterPath: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
                    backdropPath: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
                    rating: details.vote_average,
                    ageRating: ageRating,
                    releaseDate: details.release_date || details.first_air_date,
                    genres: details.genres?.map((g: any) => g.name).join(', '),
                    cast: JSON.stringify(details.credits?.cast?.slice(0, 5).map((c: any) => ({ name: c.name, character: c.character })))
                }
            });
        } catch (error) {
            console.error(`[TMDB] Enrichment error for ${title}:`, error);
            return null;
        }
    }
}
