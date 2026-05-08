package com.smartifly.tv.data.mapper

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.dto.ContentDto
import com.smartifly.tv.data.remote.dto.StreamDto

fun ContentDto.toDomain(): MovieMetadata {
    return MovieMetadata(
        id = id,
        title = title,
        description = description,
        year = year ?: "",
        rating = rating ?: "",
        duration = duration ?: "",
        posterUrl = posterUrl,
        backdropUrl = backdropUrl,
        type = if (this.id.contains("series")) "series" else "movie"
    )
}

fun StreamDto.toDomain(): MovieMetadata {
    return MovieMetadata(
        id = id,
        title = title,
        description = "",
        year = "",
        rating = "",
        duration = "",
        posterUrl = "",
        backdropUrl = backdropUrl
    )
}
