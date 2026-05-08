package com.smartifly.tv.data.remote

import com.google.gson.annotations.SerializedName

data class XtreamCategoryDto(
    @SerializedName("category_id") val categoryId: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
)

data class XtreamMovieDto(
    @SerializedName("stream_id") val streamId: Int? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("stream_icon") val streamIcon: String? = null,
    @SerializedName("rating_5based") val rating: String? = null,
    @SerializedName("category_id") val categoryId: String? = null,
)

data class XtreamLiveStreamDto(
    @SerializedName("stream_id") val streamId: Int? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("stream_icon") val streamIcon: String? = null,
    @SerializedName("category_id") val categoryId: String? = null,
)

data class XtreamSeriesDto(
    @SerializedName("series_id") val seriesId: Int? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("cover") val cover: String? = null,
    @SerializedName("rating_5based") val rating: String? = null,
    @SerializedName("category_id") val categoryId: String? = null,
)

data class XtreamVodInfoResponseDto(
    @SerializedName("info") val info: XtreamVodInfoDto? = null,
)

data class XtreamVodInfoDto(
    @SerializedName("name") val name: String? = null,
    @SerializedName("plot") val plot: String? = null,
    @SerializedName("rating") val rating: String? = null,
    @SerializedName("genre") val genre: String? = null,
    @SerializedName("director") val director: String? = null,
    @SerializedName("cast") val cast: String? = null,
    @SerializedName("duration") val duration: String? = null,
    @SerializedName("releasedate") val releasedate: String? = null,
    @SerializedName("movie_image") val movieImage: String? = null,
    @SerializedName("backdrop_path") val backdropPath: List<String>? = null,
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null,
)

data class XtreamSeriesInfoResponseDto(
    @SerializedName("info") val info: XtreamSeriesInfoDto? = null,
    @SerializedName("episodes") val episodes: Map<String, List<XtreamSeriesEpisodeDto>>? = null,
)

data class XtreamSeriesInfoDto(
    @SerializedName("name") val name: String? = null,
    @SerializedName("plot") val plot: String? = null,
    @SerializedName("rating") val rating: String? = null,
    @SerializedName("genre") val genre: String? = null,
    @SerializedName("director") val director: String? = null,
    @SerializedName("cast") val cast: String? = null,
    @SerializedName("cover") val cover: String? = null,
    @SerializedName("backdrop_path") val backdropPath: List<String>? = null,
    @SerializedName("youtube_trailer") val youtubeTrailer: String? = null,
)

data class XtreamSeriesEpisodeDto(
    @SerializedName("id") val id: Int? = null,
    @SerializedName("title") val title: String? = null,
    @SerializedName("episode_num") val episodeNum: Int? = null,
    @SerializedName("container_extension") val containerExtension: String? = null,
    @SerializedName("info") val info: XtreamSeriesEpisodeInfoDto? = null,
)

data class XtreamSeriesEpisodeInfoDto(
    @SerializedName("duration") val duration: String? = null,
    @SerializedName("movie_image") val movieImage: String? = null,
)
