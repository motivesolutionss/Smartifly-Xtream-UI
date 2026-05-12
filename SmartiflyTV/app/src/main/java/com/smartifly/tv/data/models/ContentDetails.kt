package com.smartifly.tv.data.models

/**
 * Enterprise-grade Domain Model for Rich Content Details.
 * 
 * Aggregates information for Movies and Series into a unified UI-friendly structure.
 */
data class ContentDetails(
    val id: String,
    val title: String,
    val description: String,
    val posterUrl: String,
    val backdropUrl: String,
    val releaseDate: String,
    val rating: String,
    val cast: String,
    val director: String,
    val genre: String,
    val duration: String,
    val type: String, // "movie" or "series"
    val categoryId: String = "",
    val seasons: List<Season>? = null
) {
    fun toMovieMetadata(): MovieMetadata {
        return MovieMetadata(
            id = id,
            title = title,
            description = description,
            year = releaseDate.take(4),
            rating = rating,
            duration = duration,
            posterUrl = posterUrl,
            backdropUrl = backdropUrl,
            type = type,
            categoryId = categoryId
        )
    }
}

data class Season(
    val number: Int,
    val episodes: List<Episode>
)

data class Episode(
    val id: String,
    val title: String,
    val overview: String,
    val imageUrl: String,
    val duration: String,
    val streamId: Int
)
