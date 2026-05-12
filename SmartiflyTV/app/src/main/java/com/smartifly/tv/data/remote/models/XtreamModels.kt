package com.smartifly.tv.data.remote.models

import com.google.gson.annotations.SerializedName

/**
 * Enterprise-grade Data Models for Xtream UI API (2025.05 Edition).
 * 
 * These models are designed for resilience, featuring:
 * - Full KDoc documentation for traceability.
 * - Strict nullability handling to prevent crashes on inconsistent IPTV backends.
 * - Optimized camelCase naming conventions using @SerializedName.
 */

/**
 * Detailed user information and session metadata.
 */
data class XtreamUserInfo(
    val username: String,
    val password: String,
    val message: String? = null,
    val auth: Int = 0,
    val status: String? = "Active",
    @SerializedName("exp_date") val expDate: String? = null,
    @SerializedName("is_trial") val isTrial: String? = "0",
    @SerializedName("active_cons") val activeCons: String? = "0",
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("max_connections") val maxConnections: String? = "1",
    @SerializedName("allowed_output_formats") val allowedOutputFormats: List<String> = emptyList()
)

/**
 * Server infrastructure details provided during authentication.
 */
data class XtreamServerInfo(
    val url: String? = null,
    val port: String? = null,
    @SerializedName("https_port") val httpsPort: String? = null,
    @SerializedName("server_protocol") val serverProtocol: String? = "http",
    @SerializedName("rtmp_port") val rtmpPort: String? = null,
    val timezone: String? = "UTC",
    @SerializedName("timestamp_now") val timestampNow: Long? = null,
    @SerializedName("time_now") val timeNow: String? = null
)

/**
 * Primary authentication response containing both user and server context.
 */
data class XtreamAuthResponse(
    @SerializedName("user_info") val userInfo: XtreamUserInfo,
    @SerializedName("server_info") val serverInfo: XtreamServerInfo
)

/**
 * Standard content category (Movies, Series, or Live TV).
 */
data class XtreamCategory(
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("category_name") val categoryName: String,
    @SerializedName("parent_id") val parentId: Int = 0
)

/**
 * Live TV channel metadata.
 */
data class XtreamLiveStream(
    val num: Int = 0,
    val name: String,
    @SerializedName("stream_type") val streamType: String? = "live",
    @SerializedName("stream_id") val streamId: Int,
    @SerializedName("stream_icon") val streamIcon: String? = null,
    val added: String? = null,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("custom_sid") val customSid: String? = null,
    @SerializedName("tv_archive") val tvArchive: Int = 0,
    @SerializedName("direct_source") val directSource: String? = null,
    @SerializedName("tv_archive_duration") val tvArchiveDuration: Int = 0
)

/**
 * Video On Demand (VOD) movie metadata.
 */
data class XtreamMovie(
    val num: Int = 0,
    val name: String,
    @SerializedName("stream_type") val streamType: String? = "movie",
    @SerializedName("stream_id") val streamId: Int,
    @SerializedName("stream_icon") val streamIcon: String? = null,
    val rating: String? = null,
    @SerializedName("rating_5based") val rating5Based: Double = 0.0,
    val added: String? = null,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("container_extension") val containerExtension: String? = "mkv",
    @SerializedName("custom_sid") val customSid: String? = null,
    @SerializedName("direct_source") val directSource: String? = null,
    val cover: String? = null,
    @SerializedName("cover_big") val coverBig: String? = null,
    val plot: String? = null,
    val genre: String? = null,
    @SerializedName("backdrop_path") val backdropPath: List<String> = emptyList(),
    @SerializedName("tmdb_id") val tmdbId: String? = null,
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null
)

/**
 * TV Series / Show metadata.
 */
data class XtreamSeries(
    val num: Int = 0,
    val name: String,
    @SerializedName("series_id") val seriesId: Int,
    val cover: String? = null,
    @SerializedName("cover_big") val coverBig: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val releaseDate: String? = null,
    @SerializedName("last_modified") val lastModified: String? = null,
    val rating: String? = null,
    @SerializedName("rating_5based") val rating5Based: Double = 0.0,
    @SerializedName("backdrop_path") val backdropPath: List<String> = emptyList(),
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null,
    @SerializedName("episode_run_time") val episodeRunTime: String? = null,
    @SerializedName("category_id") val categoryId: String
)

/**
 * Generic wrapper for paged content responses.
 */
data class XtreamPagedResponse<T>(
    val items: List<T>,
    val page: Int,
    val limit: Int,
    val hasMore: Boolean,
    val serverPaginated: Boolean
)

/**
 * Detailed information for a specific VOD content.
 */
data class XtreamMovieInfo(
    val info: XtreamMovieData?,
    @SerializedName("movie_data") val movieData: XtreamMovieTechnicalData? = null
)

/**
 * Technical metadata for a movie (stream details).
 */
data class XtreamMovieTechnicalData(
    @SerializedName("stream_id") val streamId: Int? = null,
    @SerializedName("container_extension") val containerExtension: String? = null
)

/**
 * Extended technical and cinematic data for a movie.
 */
data class XtreamMovieData(
    @SerializedName("tmdb_id") val tmdbId: String? = null,
    val name: String? = null,
    @SerializedName("o_name") val originalName: String? = null,
    @SerializedName("movie_image") val movieImage: String? = null,
    @SerializedName("releasedate") val releaseDate: String? = null,
    val plot: String? = null,
    val director: String? = null,
    val cast: String? = null,
    val genre: String? = null,
    @SerializedName("backdrop_path") val backdropPath: List<String> = emptyList(),
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null,
    val duration: String? = null,
    val rating: String? = null
)

/**
 * Comprehensive series data including seasonal episode mapping.
 */
data class XtreamSeriesInfo(
    val info: XtreamSeriesDetails?,
    val seasons: List<Map<String, Any>>? = emptyList(), // Optional season metadata
    val episodes: Map<String, List<XtreamEpisode>> = emptyMap()
)

/**
 * Core details for a TV series.
 */
data class XtreamSeriesDetails(
    @SerializedName("series_id") val seriesId: Int? = null,
    val name: String? = null,
    val cover: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val releaseDate: String? = null,
    val rating: String? = null,
    @SerializedName("backdrop_path") val backdropPath: List<String> = emptyList(),
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null
)

/**
 * Metadata for a specific series episode.
 */
data class XtreamEpisode(
    val id: String,
    @SerializedName("stream_id") val streamId: Int,
    val title: String,
    @SerializedName("plot") val plot: String? = null,
    @SerializedName("container_extension") val containerExtension: String? = "mkv",
    val info: XtreamEpisodeInfo? = null
)

/**
 * Cinematic details for a specific episode.
 */
data class XtreamEpisodeInfo(
    val plot: String? = null,
    val duration: String? = null,
    @SerializedName("movie_image") val movieImage: String? = null,
    @SerializedName("release_date") val releaseDate: String? = null
)
