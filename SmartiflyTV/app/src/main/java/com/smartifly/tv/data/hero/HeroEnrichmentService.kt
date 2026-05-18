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
                merge(base, details.posterUrl, details.backdropUrl, details.description, details.rating, details.releaseDate)
            }
            else -> null
        }
    }

    private suspend fun enrichSeries(base: MovieMetadata, seriesId: Int): MovieMetadata? {
        return when (val result = xtreamRepository.getSeriesInfo(seriesId)) {
            is NetworkResult.Success -> {
                val details = result.data.toDomain()
                merge(base, details.posterUrl, details.backdropUrl, details.description, details.rating, details.releaseDate)
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
        detailReleaseDate: String
    ): MovieMetadata {
        val poster = HeroImageResolver.normalizeImageUrl(detailPoster)
            ?: HeroImageResolver.normalizeImageUrl(base.posterUrl)
            ?: ""

        val backdrop = HeroImageResolver.normalizeImageUrl(detailBackdrop)
            ?: HeroImageResolver.normalizeImageUrl(base.backdropUrl)
            ?: poster

        val description = if (detailDescription.isNotBlank()) detailDescription else base.description
        val rating = if (detailRating.isNotBlank()) detailRating else base.rating
        val year = detailReleaseDate.takeIf { it.isNotBlank() }?.take(4) ?: base.year

        return base.copy(
            posterUrl = poster,
            backdropUrl = backdrop,
            description = description,
            rating = rating,
            year = year
        )
    }
}
