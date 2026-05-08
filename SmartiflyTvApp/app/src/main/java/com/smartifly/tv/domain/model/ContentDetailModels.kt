package com.smartifly.tv.domain.model

data class MovieDetail(
    val streamId: Int,
    val title: String,
    val plot: String,
    val rating: Double?,
    val genre: String?,
    val director: String?,
    val cast: String?,
    val duration: String?,
    val releaseYear: String?,
    val posterUrl: String,
    val backdropUrl: String,
    val trailerUrl: String?,
    val contentRating: String? = null,
)

data class SeriesEpisode(
    val id: Int,
    val title: String,
    val episodeNumber: Int,
    val seasonNumber: Int,
    val duration: String?,
    val imageUrl: String,
    val containerExtension: String?,
)

data class SeriesDetail(
    val seriesId: Int,
    val title: String,
    val plot: String,
    val rating: Double?,
    val genre: String?,
    val director: String?,
    val cast: String?,
    val posterUrl: String,
    val backdropUrl: String,
    val trailerUrl: String?,
    val episodes: List<SeriesEpisode>,
    val contentRating: String? = null,
)

data class PlaybackSession(
    val title: String,
    val streamUrl: String,
    val type: String,
    val historyId: String? = null,
    val sourceId: Int? = null,
    val imageUrl: String = "",
    val episodeId: Int? = null,
    val resumePositionMs: Long = 0L,
)
