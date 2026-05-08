package com.smartifly.tv.features.profiles

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile

object ContentRestrictionManager {
    private val kidsAllowedRatings = listOf("G", "PG", "TV-Y", "TV-Y7", "TV-G")

    fun isContentAllowed(profile: UserProfile, rating: String?): Boolean {
        if (!profile.isKids) return true
        if (rating == null) return false
        return kidsAllowedRatings.any { rating.contains(it, ignoreCase = true) }
    }

    fun filterMovies(profile: UserProfile, movies: List<MovieMetadata>): List<MovieMetadata> {
        if (!profile.isKids) return movies
        return movies.filter { isContentAllowed(profile, it.rating) }
    }
}
