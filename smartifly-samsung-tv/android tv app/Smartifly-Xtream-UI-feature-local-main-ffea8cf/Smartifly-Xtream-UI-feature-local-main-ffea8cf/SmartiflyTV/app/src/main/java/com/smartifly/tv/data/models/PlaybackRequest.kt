package com.smartifly.tv.data.models

/**
 * Explicit player contract that preserves live-specific data instead of
 * collapsing everything into a generic catalog card model.
 */
sealed interface PlaybackRequest {
    val id: String
    val type: String
    val title: String
    val categoryId: String

    data class Live(
        val channel: LiveStream
    ) : PlaybackRequest {
        override val id: String = channel.id
        override val type: String = "live"
        override val title: String = channel.name
        override val categoryId: String = channel.categoryId
    }

    data class OnDemand(
        val content: MovieMetadata
    ) : PlaybackRequest {
        override val id: String = content.id
        override val type: String = content.type
        override val title: String = content.title
        override val categoryId: String = content.categoryId
    }
}

fun PlaybackRequest.asMovieMetadata(): MovieMetadata {
    return when (this) {
        is PlaybackRequest.Live -> MovieMetadata(
            id = channel.id,
            title = channel.name,
            description = channel.currentProgram ?: "Live Broadcast",
            year = "",
            rating = "",
            duration = "LIVE",
            posterUrl = channel.logoUrl,
            backdropUrl = channel.logoUrl,
            type = "live",
            categoryId = channel.categoryId
        )
        is PlaybackRequest.OnDemand -> content
    }
}
