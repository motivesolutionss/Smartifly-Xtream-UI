package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import kotlinx.coroutines.flow.first

class RecommendationRepository(
    private val xtreamRepository: XtreamRepository,
    private val resumeRepository: com.smartifly.tv.data.ResumeWatchingRepository,
    private val watchlistRepository: WatchlistRepository
) {
    private companion object {
        private const val RECOMMENDATION_CATEGORY_SCAN_LIMIT = 6
        private const val RECOMMENDATION_POOL_MAX_ITEMS = 300
    }

    suspend fun getPersonalizedHome(profileId: String, activeProfile: com.smartifly.tv.data.models.UserProfile): List<com.smartifly.tv.features.home.HomeSection> {
        val history = resumeRepository.getAllWatchProgress(profileId).first()
        val watchlist = watchlistRepository.getWatchlist(profileId).first()
        
        val sections = mutableListOf<com.smartifly.tv.features.home.HomeSection>()

        // 1. Continue Watching
        if (history.isNotEmpty()) {
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Continue Watching",
                    items = history.map { it.metadata },
                    progressList = history.map { it.positionMs.toFloat() / it.durationMs.toFloat() }
                )
            )
        }

        val recommendationPool = buildRecommendationPool()

        // 2. Because You Watched...
        if (history.isNotEmpty() && recommendationPool.isNotEmpty()) {
            val lastWatched = history.first().metadata
            val similar = recommendationPool.shuffled().take(10)
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Because You Watched ${lastWatched.title}",
                    items = similar
                )
            )
        }

        // 3. Recommended For You
        if (recommendationPool.isNotEmpty()) {
            val recommended = recommendationPool.shuffled().take(12)
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Recommended For You",
                    items = recommended
                )
            )
        }

        // 4. More Like Your Watchlist
        if (watchlist.isNotEmpty() && recommendationPool.isNotEmpty()) {
            val watchlistSimilars = recommendationPool.shuffled().take(8)
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "More Like Your Watchlist",
                    items = watchlistSimilars
                )
            )
        }

        // 5. Trending Now
        if (recommendationPool.isNotEmpty()) {
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Trending Now",
                    items = recommendationPool.take(10)
                )
            )
        }

        return sections
    }

    private suspend fun buildRecommendationPool(): List<MovieMetadata> {
        val categoriesResult = xtreamRepository.getVodCategories().first { it !is NetworkResult.Loading }
        if (categoriesResult !is NetworkResult.Success) return emptyList()

        val dedup = linkedMapOf<String, MovieMetadata>()
        for (category in categoriesResult.data.take(RECOMMENDATION_CATEGORY_SCAN_LIMIT)) {
            val scopedResult = xtreamRepository.getMoviesCached(category.id).first { it !is NetworkResult.Loading }
            if (scopedResult is NetworkResult.Success) {
                for (item in scopedResult.data) {
                    dedup.putIfAbsent("${item.type}|${item.id}", item)
                    if (dedup.size >= RECOMMENDATION_POOL_MAX_ITEMS) break
                }
            }
            if (dedup.size >= RECOMMENDATION_POOL_MAX_ITEMS) break
        }
        return dedup.values.toList()
    }
}
