package com.smartifly.tv.data.models

data class EpisodeMetadata(
    val id: String,
    val seriesId: String,
    val seasonNumber: Int,
    val episodeNumber: Int,
    val title: String,
    val thumbnailUrl: String,
    val hlsUrl: String
)
