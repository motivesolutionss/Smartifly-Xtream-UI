package com.smartifly.tv.data.hero

import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Enriches hero metadata from detail endpoints without blocking initial home render.
 */
class HeroEnrichmentService(
    private val xtreamRepository: XtreamRepository
) : HomeHeroEnricher {
    private val yearRegex = Regex("""\b(19|20)\d{2}\b""")

    override suspend fun enrich(base: MovieMetadata, timeoutMs: Long): MovieMetadata? {
        val id = base.id.toIntOrNull() ?: return null

        android.util.Log.d(
            "SmartiflyHero",
            "hero_enrichment_start id=${base.id} type=${base.type} timeout_ms=$timeoutMs"
        )
        return withTimeoutOrNull(timeoutMs) {
            when (base.type.lowercase()) {
                "movie" -> enrichMovie(base, id)
                "series" -> enrichSeries(base, id)
                else -> null
            }
        }.also { enriched ->
            if (enriched == null) {
                android.util.Log.w(
                    "SmartiflyHero",
                    "hero_enrichment_status=skip_or_fail id=${base.id} type=${base.type}"
                )
            } else {
                android.util.Log.i(
                    "SmartiflyHero",
                    "hero_enrichment_status=success id=${base.id} type=${base.type}"
                )
            }
        }
    }

    private suspend fun enrichMovie(base: MovieMetadata, movieId: Int): MovieMetadata? {
        return when (val result = xtreamRepository.getMovieInfo(movieId)) {
            is NetworkResult.Success -> {
                val details = result.data.toDomain()
                merge(
                    base = base,
                    detailPoster = details.posterUrl,
                    detailBackdrop = details.backdropUrl,
                    detailDescription = details.description,
                    detailRating = details.rating,
                    detailReleaseDate = details.releaseDate,
                    detailGenre = details.genre
                )
            }
            else -> null
        }
    }

    private suspend fun enrichSeries(base: MovieMetadata, seriesId: Int): MovieMetadata? {
        return when (val result = xtreamRepository.getSeriesInfo(seriesId)) {
            is NetworkResult.Success -> {
                val details = result.data.toDomain()
                merge(
                    base = base,
                    detailPoster = details.posterUrl,
                    detailBackdrop = details.backdropUrl,
                    detailDescription = details.description,
                    detailRating = details.rating,
                    detailReleaseDate = details.releaseDate,
                    detailGenre = details.genre
                )
            }
            else -> null
        }
    }

    private fun merge(
        base: MovieMetadata,
        detailPoster: String,
        detailBackdrop: String,
        detailDescription: String,
        detailRating: String,
        detailReleaseDate: String,
        detailGenre: String
    ): MovieMetadata {
        val poster = HeroImageResolver.normalizeImageUrl(detailPoster)
            ?: HeroImageResolver.normalizeImageUrl(base.posterUrl)
            ?: ""

        val backdrop = HeroImageResolver.normalizeImageUrl(detailBackdrop)
            ?: HeroImageResolver.normalizeImageUrl(base.backdropUrl)
            ?: ""

        val description = if (detailDescription.isNotBlank()) detailDescription else base.description
        val rating = if (detailRating.isNotBlank()) detailRating else base.rating
        val year = extractYear(detailReleaseDate) ?: base.year
        val genre = if (detailGenre.isNotBlank()) detailGenre else base.genre

        return base.copy(
            posterUrl = poster,
            backdropUrl = backdrop,
            description = description,
            rating = rating,
            year = year,
            genre = genre
        )
    }

    private fun extractYear(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()

        // Preferred: find canonical 4-digit year anywhere in the payload.
        yearRegex.find(trimmed)?.value?.let { return it }

        // Fallback: normalize separators and inspect end tokens like dd-mm-yyyy.
        val parts = trimmed.split('-', '/', '.', ' ').map { it.trim() }.filter { it.isNotEmpty() }
        val candidate = parts.lastOrNull()
        return if (candidate != null && candidate.length == 4 && candidate.all { it.isDigit() }) candidate else null
    }
}
