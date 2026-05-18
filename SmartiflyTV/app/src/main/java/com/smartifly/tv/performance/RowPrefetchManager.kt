package com.smartifly.tv.performance

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.hero.HeroImageResolver

class RowPrefetchManager(private val preloader: ImagePreloader) {

    suspend fun primeHomeAboveFold(
        sections: List<List<MovieMetadata>>,
        maxRails: Int = 3,
        itemsPerRail: Int = 14,
        criticalRails: Int = 2,
        criticalItemsPerRail: Int = 8,
        warmItemsPerRail: Int = (itemsPerRail + 6).coerceAtMost(22),
        debugTag: String = "home_above_fold"
    ) {
        val adjustedItemsPerRail = PreloadBackpressure.adjustCount(itemsPerRail, min = 6)
        val adjustedCriticalItems = PreloadBackpressure.adjustCount(criticalItemsPerRail, min = 4)
        val adjustedWarmItems = PreloadBackpressure.adjustCount(warmItemsPerRail, min = adjustedItemsPerRail)
        val cappedSections = sections.take(maxRails.coerceAtLeast(1))

        // Window A: immediate viewport critical set.
        val criticalUrls = collectWindowUrls(
            sections = cappedSections,
            rails = criticalRails.coerceAtLeast(1),
            itemsPerRail = adjustedCriticalItems.coerceAtLeast(1)
        )
        val criticalSet = criticalUrls.toSet()
        // Window B: near-future cards user reaches in the next few scroll actions.
        val nearUrls = collectWindowUrls(
            sections = cappedSections,
            rails = 3,
            itemsPerRail = adjustedItemsPerRail
        ).filterNot { it in criticalSet }
        val nearSet = nearUrls.toSet()
        // Window C: warm-cache remainder; do not block render path.
        val warmUrls = collectWindowUrls(
            sections = cappedSections,
            rails = cappedSections.size,
            itemsPerRail = adjustedWarmItems.coerceAtLeast(adjustedItemsPerRail)
        ).filterNot { it in criticalSet || it in nearSet }

        if (criticalUrls.isNotEmpty()) {
            preloader.preloadBatchInOrderWithTelemetry("${debugTag}_critical", criticalUrls)
        }
        if (nearUrls.isNotEmpty()) {
            preloader.preloadBatchInOrderWithTelemetry("${debugTag}_near", nearUrls)
        }
        if (warmUrls.isNotEmpty()) {
            preloader.preloadBatch(warmUrls)
        }
    }

    fun onCardFocused(
        currentIndex: Int,
        items: List<MovieMetadata>,
        prefetchCount: Int = 12,
        backwardBufferCount: Int = 4
    ) {
        if (currentIndex !in items.indices) return
        val adjustedForward = PreloadBackpressure.adjustCount(prefetchCount, min = 3)
        val adjustedBackward = PreloadBackpressure.adjustCount(backwardBufferCount, min = 1)

        // Focus-first: preload focused card candidates first.
        val focused = items[currentIndex]
        preloader.preloadBatch(buildImageCandidates(focused))

        // Then preload the immediate horizon to reduce visible pop-in.
        val nextItems = items.drop(currentIndex + 1).take(adjustedForward)
        preloader.preloadBatch(nextItems.flatMap(::buildImageCandidates))

        // Backward buffer for reverse scrolling.
        val prevItems = items.take(currentIndex).takeLast(adjustedBackward.coerceAtLeast(0))
        preloader.preloadBatch(prevItems.flatMap(::buildImageCandidates))
    }

    private fun MutableList<String>.addPreferredImageCandidates(movie: MovieMetadata) {
        addAll(buildImageCandidates(movie))
    }

    private fun collectWindowUrls(
        sections: List<List<MovieMetadata>>,
        rails: Int,
        itemsPerRail: Int
    ): List<String> {
        return buildList {
            sections.take(rails).forEach { rail ->
                rail.take(itemsPerRail).forEach { movie ->
                    addPreferredImageCandidates(movie)
                }
            }
        }.distinct()
    }

    private fun buildImageCandidates(movie: MovieMetadata): List<String> {
        return listOf(movie.posterUrl, movie.backdropUrl)
            .mapNotNull { HeroImageResolver.normalizeImageUrl(it) }
            .distinct()
    }
}
