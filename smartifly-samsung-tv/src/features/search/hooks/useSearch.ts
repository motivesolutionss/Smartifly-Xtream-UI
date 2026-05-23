import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import type { AppChannel, AppMovie, AppSeries } from "../../../types/appModels";

export interface SearchResults {
  live: AppChannel[];
  vod: AppMovie[];
  series: AppSeries[];
}

export const useSearch = (query: string) => {
  return useQuery<SearchResults>({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 3) return { live: [], vod: [], series: [] };

      // 1. Fetch all streams and categories in parallel
      const results = await Promise.allSettled([
        services.content.getLiveStreams(),
        services.content.getVodStreams(),
        services.content.getSeries(),
        services.content.getLiveCategories(),
        services.content.getVodCategories(),
        services.content.getSeriesCategories(),
      ]);

      const live = results[0].status === "fulfilled" ? results[0].value : [];
      const vod = results[1].status === "fulfilled" ? results[1].value : [];
      const series = results[2].status === "fulfilled" ? results[2].value : [];
      
      const liveCats = results[3].status === "fulfilled" ? results[3].value : [];
      const vodCats = results[4].status === "fulfilled" ? results[4].value : [];
      const seriesCats = results[5].status === "fulfilled" ? results[5].value : [];

      if (
        results[0].status === "rejected" &&
        results[1].status === "rejected" &&
        results[2].status === "rejected"
      ) {
        throw results[0].reason;
      }

      const lowerQuery = query.toLowerCase();

      // Escape special characters for safe regular expression checks
      const escapeRegExp = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      // 2. Enterprise-Grade Hybrid Query Matcher for Categories
      const matchCategory = (catName: string) => {
        const nameLower = catName.toLowerCase();
        
        // Direct substring check
        if (nameLower.includes(lowerQuery) || lowerQuery.includes(nameLower)) {
          return true;
        }

        // Tokenized matching for multi-word queries
        const queryTokens = lowerQuery.split(/\s+/).filter(t => t.length >= 3);
        for (const token of queryTokens) {
          const isGenericToken = [
            "vod", "live", "series", "show", "shows", 
            "movie", "movies", "channel", "channels", "pick", "picks"
          ].includes(token);

          if (isGenericToken && nameLower !== token) {
            continue;
          }

          if (nameLower.includes(token)) {
            return true;
          }
        }
        return false;
      };

      // 3. Collect matching category IDs
      const matchingLiveCatIds = new Set(liveCats.filter(c => matchCategory(c.name)).map(c => c.id));
      const matchingVodCatIds = new Set(vodCats.filter(c => matchCategory(c.name)).map(c => c.id));
      const matchingSeriesCatIds = new Set(seriesCats.filter(c => matchCategory(c.name)).map(c => c.id));

      // 4. Relevance Ranking Engine
      const calculateRelevanceScore = (
        item: AppChannel | AppMovie | AppSeries, 
        matchingCatIds: Set<string>
      ) => {
        const titleLower = item.title.toLowerCase();

        // Rank 1: Exact Match (Score 100)
        if (titleLower === lowerQuery) return 100;

        // Rank 2: Prefix Match (Score 80)
        if (titleLower.startsWith(lowerQuery)) return 80;

        // Rank 3: Word Boundary Match (Score 60)
        try {
          const escaped = escapeRegExp(lowerQuery);
          const wordRegex = new RegExp(`\\b${escaped}\\b`, "i");
          if (wordRegex.test(titleLower)) return 60;
        } catch {
          // Fallback if RegExp generation fails for any reason
        }

        // Rank 4: Substring Match (Score 40)
        if (titleLower.includes(lowerQuery)) return 40;

        // Rank 5: Category Match (Score 20)
        if (item.categoryId && matchingCatIds.has(item.categoryId)) return 20;

        return 0;
      };

      // 5. Filter, Score, Sort, and Map results
      const scoredLive = live
        .map(item => ({ item, score: calculateRelevanceScore(item, matchingLiveCatIds) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.item);

      const scoredVod = vod
        .map(item => ({ item, score: calculateRelevanceScore(item, matchingVodCatIds) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.item);

      const scoredSeries = series
        .map(item => ({ item, score: calculateRelevanceScore(item, matchingSeriesCatIds) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.item);

      // 6. Return top 50 items per rail
      return {
        live: scoredLive.slice(0, 50),
        vod: scoredVod.slice(0, 50),
        series: scoredSeries.slice(0, 50)
      };
    },
    enabled: query.length >= 3,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
