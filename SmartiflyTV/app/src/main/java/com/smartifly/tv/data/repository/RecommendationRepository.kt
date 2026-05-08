package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata
import kotlinx.coroutines.flow.first

class RecommendationRepository(
    private val contentRepository: ContentRepository,
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

        // 1. Continue Watching (Handled by HomeViewModel usually, but we can centralize here)
        if (history.isNotEmpty()) {
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Continue Watching",
                    items = filter(history.map { it.metadata }),
                    progressList = history.map { it.positionMs.toFloat() / it.durationMs.toFloat() }
                )
            )
        }

        // 2. Because You Watched... (Pick the last watched movie's genre or similar)
        if (history.isNotEmpty()) {
            val lastWatched = history.first().metadata
            // Fetch similar from API or filter local for now
            val similar = contentRepository.getMovies().shuffled().take(10) // Simulating "Because You Watched"
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "Because You Watched ${lastWatched.title}",
                    items = filter(similar)
                )
            )
        }

        // 3. Recommended For You (Based on genres from history/watchlist)
        val recommended = contentRepository.getMovies().shuffled().take(12)
        sections.add(
            com.smartifly.tv.features.home.HomeSection(
                title = "Recommended For You",
                items = filter(recommended)
            )
        )

        // 4. More Like Your Watchlist
        if (watchlist.isNotEmpty()) {
            val watchlistSimilars = contentRepository.getMovies().shuffled().take(8)
            sections.add(
                com.smartifly.tv.features.home.HomeSection(
                    title = "More Like Your Watchlist",
                    items = filter(watchlistSimilars)
                )
            )
        }

        // 5. Trending Now
        sections.add(
            com.smartifly.tv.features.home.HomeSection(
                title = "Trending Now",
                items = filter(contentRepository.getMovies().take(10))
            )
        )

        return sections
    }
}
