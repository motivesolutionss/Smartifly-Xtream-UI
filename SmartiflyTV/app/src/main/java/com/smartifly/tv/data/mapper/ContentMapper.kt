package com.smartifly.tv.data.mapper

import com.smartifly.tv.data.models.*
import com.smartifly.tv.data.remote.models.*
import com.smartifly.tv.data.hero.HeroImageResolver
import com.smartifly.tv.data.hero.HeroImageSources

/**
 * Enterprise-grade Mappers for Xtream UI Data Models.
 * 
 * These functions translate raw API DTOs into professional Domain Models
 * used by the UI layer (Compose).
 */

fun XtreamMovie.toDomain(): MovieMetadata {
    val poster = HeroImageResolver.normalizeImageUrl(streamIcon)
        ?: HeroImageResolver.normalizeImageUrl(cover)
        ?: HeroImageResolver.normalizeImageUrl(coverBig)
        ?: ""
    val backdrop = HeroImageResolver.resolveForMovie(
        HeroImageSources(
            backdropPaths = backdropPath,
            coverBig = coverBig,
            cover = cover,
            streamIcon = streamIcon
        )
    )?.url ?: poster

    return MovieMetadata(
        id = streamId.toString(),
        title = name,
        description = plot ?: "",
        year = added?.take(4) ?: "",
        rating = rating ?: "0.0",
        duration = "",
        posterUrl = poster,
        backdropUrl = backdrop,
        type = "movie",
        categoryId = categoryId
    )
}

fun XtreamSeries.toDomain(): MovieMetadata {
    val poster = HeroImageResolver.normalizeImageUrl(cover)
        ?: HeroImageResolver.normalizeImageUrl(coverBig)
        ?: ""
    val backdrop = HeroImageResolver.resolveForSeries(
        HeroImageSources(
            backdropPaths = backdropPath,
            coverBig = coverBig,
            cover = cover
        )
    )?.url ?: poster

    return MovieMetadata(
        id = seriesId.toString(),
        title = name,
        description = plot ?: "",
        year = releaseDate?.take(4) ?: "",
        rating = rating ?: "0.0",
        duration = episodeRunTime ?: "",
        posterUrl = poster,
        backdropUrl = backdrop,
        type = "series",
        categoryId = categoryId
    )
}

fun XtreamLiveStream.toDomainLive(): LiveStream {
    return LiveStream(
        id = streamId.toString(),
        name = name,
        logoUrl = streamIcon ?: "",
        categoryId = categoryId,
        archiveAvailable = tvArchive == 1,
        archiveDuration = tvArchiveDuration
    )
}

fun XtreamCategory.toDomain(): MediaCategory {
    return MediaCategory(
        id = categoryId,
        name = categoryName,
        parentId = parentId
    )
}

fun XtreamMovieInfo.toDomain(): ContentDetails {
    val movie = this.info
    val poster = HeroImageResolver.normalizeImageUrl(movie?.movieImage) ?: ""
    val backdrop = HeroImageResolver.resolveForMovie(
        HeroImageSources(
            backdropPaths = movie?.backdropPath ?: emptyList(),
            movieImage = movie?.movieImage
        )
    )?.url ?: poster

    return ContentDetails(
        id = this.movieData?.streamId?.toString() ?: "",
        title = movie?.name ?: "",
        description = movie?.plot ?: "",
        posterUrl = poster,
        backdropUrl = backdrop,
        releaseDate = movie?.releaseDate ?: "",
        rating = movie?.rating ?: "0.0",
        cast = movie?.cast ?: "",
        director = movie?.director ?: "",
        genre = movie?.genre ?: "",
        duration = movie?.duration ?: "",
        type = "movie"
    )
}

fun XtreamSeriesInfo.toDomain(): ContentDetails {
    val series = this.info
    val poster = HeroImageResolver.normalizeImageUrl(series?.cover) ?: ""
    val backdrop = HeroImageResolver.resolveForSeries(
        HeroImageSources(
            backdropPaths = series?.backdropPath ?: emptyList(),
            cover = series?.cover
        )
    )?.url ?: poster
    val domainSeasons = this.episodes.entries.map { (seasonNum, episodes) ->
        Season(
            number = seasonNum.toIntOrNull() ?: 0,
            episodes = episodes.map { ep ->
                Episode(
                    id = ep.id,
                    title = ep.title,
                    overview = ep.plot ?: ep.info?.plot ?: "",
                    imageUrl = ep.info?.movieImage ?: "",
                    duration = ep.info?.duration ?: "",
                    streamId = ep.streamId
                )
            }
        )
    }

    return ContentDetails(
        id = series?.seriesId?.toString() ?: "",
        title = series?.name ?: "",
        description = series?.plot ?: "",
        posterUrl = poster,
        backdropUrl = backdrop,
        releaseDate = series?.releaseDate ?: "",
        rating = series?.rating ?: "0.0",
        cast = series?.cast ?: "",
        director = series?.director ?: "",
        genre = series?.genre ?: "",
        duration = "",
        type = "series",
        seasons = domainSeasons
    )
}

// ==========================================
// DATABASE ENTITY MAPPERS
// ==========================================

fun XtreamCategory.toEntity(type: String): com.smartifly.tv.data.local.entities.CategoryEntity {
    return com.smartifly.tv.data.local.entities.CategoryEntity(
        categoryId = categoryId,
        categoryName = categoryName,
        parentId = parentId.toString(),
        type = type
    )
}

fun com.smartifly.tv.data.local.entities.CategoryEntity.toDomain(): MediaCategory {
    return MediaCategory(
        id = categoryId,
        name = categoryName,
        parentId = parentId.toIntOrNull() ?: 0
    )
}

fun XtreamLiveStream.toEntity(): com.smartifly.tv.data.local.entities.StreamEntity {
    return com.smartifly.tv.data.local.entities.StreamEntity(
        streamId = streamId,
        name = name,
        streamType = "live",
        categoryId = categoryId,
        streamIcon = streamIcon,
        rating = null,
        added = added
    )
}

fun XtreamMovie.toEntity(): com.smartifly.tv.data.local.entities.StreamEntity {
    return com.smartifly.tv.data.local.entities.StreamEntity(
        streamId = streamId,
        name = name,
        streamType = "movie",
        categoryId = categoryId,
        streamIcon = streamIcon,
        rating = rating,
        added = added
    )
}

fun XtreamSeries.toEntity(): com.smartifly.tv.data.local.entities.StreamEntity {
    return com.smartifly.tv.data.local.entities.StreamEntity(
        streamId = seriesId,
        name = name,
        streamType = "series",
        categoryId = categoryId,
        streamIcon = cover,
        rating = rating,
        added = lastModified
    )
}

fun com.smartifly.tv.data.local.entities.StreamEntity.toDomainLive(): LiveStream {
    return LiveStream(
        id = streamId.toString(),
        name = name,
        logoUrl = streamIcon ?: "",
        categoryId = categoryId,
        archiveAvailable = false,
        archiveDuration = 0
    )
}

fun com.smartifly.tv.data.local.entities.StreamEntity.toDomainMovie(): MovieMetadata {
    return MovieMetadata(
        id = streamId.toString(),
        title = name,
        description = "",
        year = added?.take(4) ?: "",
        rating = rating ?: "0.0",
        duration = "",
        posterUrl = streamIcon ?: "",
        backdropUrl = "",
        type = streamType,
        categoryId = categoryId
    )
}
