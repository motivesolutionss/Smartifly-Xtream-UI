package com.smartifly.tv.data.models

data class MovieMetadata(
    val id: String,
    val title: String,
    val description: String,
    val year: String,
    val rating: String,
    val duration: String,
    val posterUrl: String,
    val backdropUrl: String,
    val type: String = "movie",
    val categoryId: String = "",
    val genre: String = "",
    val qualityLabel: String = "",
    val badges: List<String> = emptyList()
)
