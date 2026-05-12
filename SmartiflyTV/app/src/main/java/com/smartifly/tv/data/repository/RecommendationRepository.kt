package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.mapper.toDomain
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.first

class RecommendationRepository(
    private val xtreamRepository: XtreamRepository,
    private val resumeRepository: com.smartifly.tv.data.ResumeWatchingRepository,
    private val watchlistRepository: WatchlistRepository
) {
    suspend fun getPersonalizedHome(profileId: String, activeProfile: com.smartifly.tv.data.models.UserProfile): List<com.smartifly.tv.features.home.HomeSection> {
        val history = resumeRepository.getAllWatchProgress(profileId).first()
        val watchlist = watchlistRepository.getWatchlist(profileId).first()
        
        val sections = mutableListOf<com.smartifly.tv.features.home.HomeSection>()
        
        val filter = { items: List<MovieMetadata> -> 
            com.smartifly.tv.features.profiles.ContentRestrictionManager.filterMovies(activeProfile, items)
        }

        // 1. Continue Watching
        if (history.isNotEmpty()) {
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Continue Watching",
                    items = filter(history.map { it.metadata }),
                    progressList = history.map { it.positionMs.toFloat() / it.durationMs.toFloat() }
                )
            )
        }

        // Fetch some base content for recommendations
        val allMoviesResult = xtreamRepository.getMovies("0").firstOrNull()
        val allMovies = if (allMoviesResult is com.smartifly.tv.data.remote.NetworkResult.Success) {
            allMoviesResult.data.map { it.toDomain() }
        } else emptyList()

        // 2. Because You Watched...
        if (history.isNotEmpty() && allMovies.isNotEmpty()) {
            val lastWatched = history.first().metadata
            val similar = allMovies.shuffled().take(10) 
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Because You Watched ${lastWatched.title}",
                    items = filter(similar)
                )
            )
        }

        // 3. Recommended For You
        if (allMovies.isNotEmpty()) {
            val recommended = allMovies.shuffled().take(12)
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Recommended For You",
                    items = filter(recommended)
                )
            )
        }

        // 4. More Like Your Watchlist
        if (watchlist.isNotEmpty() && allMovies.isNotEmpty()) {
            val watchlistSimilars = allMovies.shuffled().take(8)
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "More Like Your Watchlist",
                    items = filter(watchlistSimilars)
                )
            )
        }

        // 5. Trending Now
        if (allMovies.isNotEmpty()) {
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Trending Now",
                    items = filter(allMovies.take(10))
                )
            )
        }

        return sections
    }
}
