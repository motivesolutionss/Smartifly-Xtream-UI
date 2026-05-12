package com.smartifly.tv.features.profiles

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile

object ContentRestrictionManager {
    // Ratings explicitly allowed for kids
    private val kidsAllowedRatings = listOf("G", "PG", "TV-Y", "TV-Y7", "TV-G", "U", "ALL", "Universal")
    
    // Ratings strictly blocked for kids
    private val adultRatings = listOf("R", "18+", "18", "NC-17", "TV-MA", "X", "Adult")

    fun isContentAllowed(profile: UserProfile, rating: String?): Boolean {
        if (!profile.isKids) return true
        
        val r = rating?.uppercase()?.trim() ?: ""
        
        // If it's explicitly in the adult list, block it immediately
        if (adultRatings.any { r.contains(it) }) return false
        
        // If it's in the allowed list, permit it
        if (kidsAllowedRatings.any { r.contains(it) }) return true
        
        // Default: If rating is unknown and we're in Kids mode, we hide it to be safe
        return false
    }

    fun filterMovies(profile: UserProfile, movies: List<MovieMetadata>): List<MovieMetadata> {
        if (!profile.isKids) return movies
        return movies.filter { isContentAllowed(profile, it.rating) }
    }
}
