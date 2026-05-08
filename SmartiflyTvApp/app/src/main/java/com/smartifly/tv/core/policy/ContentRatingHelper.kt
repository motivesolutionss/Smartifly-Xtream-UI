package com.smartifly.tv.core.policy

object ContentRatingHelper {
    val RATINGS = listOf("G", "PG", "PG-13", "R", "NC-17", "UNRATED")

    fun getRatingLevel(rating: String?): Int {
        val normalized = normalizeRating(rating)
        val index = RATINGS.indexOf(normalized)
        return if (index >= 0) index else RATINGS.indexOf("UNRATED")
    }

    fun isAllowed(
        contentRating: String?,
        isKidsProfile: Boolean,
        maxRating: String
    ): Boolean {
        val parsedRating = normalizeRating(contentRating)

        // Hide unrated content in kids mode
        if (parsedRating == "UNRATED") {
            return !isKidsProfile
        }

        val contentLevel = getRatingLevel(parsedRating)
        val profileLevel = getRatingLevel(maxRating)

        return contentLevel <= profileLevel
    }

    fun estimateRatingFromStars(stars: Double?): String {
        val score = stars ?: 0.0
        return when {
            score == 0.0 -> "UNRATED"
            score <= 4.0 -> "G"
            score <= 6.0 -> "PG"
            score <= 8.5 -> "PG-13"
            else -> "R"
        }
    }

    private fun normalizeRating(rating: String?): String {
        if (rating == null) return "UNRATED"
        val upper = rating.uppercase().trim()
        
        return when {
            RATINGS.contains(upper) -> upper
            upper.contains("TV-G") || upper.contains("TV-Y") -> "G"
            upper.contains("TV-PG") -> "PG"
            upper.contains("TV-14") -> "PG-13"
            upper.contains("TV-MA") -> "R"
            upper == "NR" || upper == "NOT RATED" -> "UNRATED"
            else -> "UNRATED"
        }
    }
}
