package com.smartifly.tv.performance

import androidx.annotation.MainThread
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.hero.HeroImageResolver
import java.net.URI

class RowPrefetchManager(private val preloader: ImagePreloader) {
    private data class FocusPrefetchState(
        val index: Int,
        val atMs: Long
    )

    private val focusStateByLane = LinkedHashMap<String, FocusPrefetchState>(16, 0.75f, true)
    private val focusThrottleMs = 140L
    private val sameIndexCooldownMs = 700L
    private val maxUrlsPerFocusPrefetch = 18
    private val primeDedupWindowMs = 2500L
    private val primeSignatureByTag = LinkedHashMap<String, Pair<Int, Long>>(16, 0.75f, true)

    suspend fun primeHomeAboveFold(
        sections: List<List<MovieMetadata>>,
        maxRails: Int = 3,
        itemsPerRail: Int = 14,
        criticalRails: Int = 2,
        criticalItemsPerRail: Int = 8,
        warmItemsPerRail: Int = (itemsPerRail + 6).coerceAtMost(22),
        debugTag: String = "home_above_fold"
    ) {
        val cappedSections = sections.take(maxRails.coerceAtLeast(1))

        // Window A: immediate viewport critical set.
        val criticalUrls = collectWindowUrls(
            sections = cappedSections,
            rails = criticalRails.coerceAtLeast(1),
            itemsPerRail = criticalItemsPerRail.coerceAtLeast(1)
        )
        val partitionKey = partitionKeyFromUrls(criticalUrls)
        val adjustedItemsPerRail = PreloadBackpressure.adjustCount(itemsPerRail, min = 6, partitionKey = partitionKey)
        val adjustedCriticalItems = PreloadBackpressure.adjustCount(criticalItemsPerRail, min = 4, partitionKey = partitionKey)
        val adjustedWarmItems = PreloadBackpressure.adjustCount(warmItemsPerRail, min = adjustedItemsPerRail, partitionKey = partitionKey)
        val adjustedCriticalUrls = collectWindowUrls(
            sections = cappedSections,
            rails = criticalRails.coerceAtLeast(1),
            itemsPerRail = adjustedCriticalItems.coerceAtLeast(1)
        )
        if (adjustedCriticalUrls.isEmpty()) return
        if (shouldSkipPrime(debugTag, adjustedCriticalUrls)) return
        val criticalSet = adjustedCriticalUrls.toSet()
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

        if (adjustedCriticalUrls.isNotEmpty()) {
            preloader.preloadBatchInOrderWithTelemetry("${debugTag}_critical", adjustedCriticalUrls.take(20))
        }
        if (nearUrls.isNotEmpty()) {
            preloader.preloadBatchInOrderWithTelemetry("${debugTag}_near", nearUrls.take(28))
        }
        if (warmUrls.isNotEmpty()) {
            preloader.preloadBatch(warmUrls.take(40))
        }
    }

    suspend fun primeHeroImage(
        movie: MovieMetadata?,
        debugTag: String = "home_hero"
    ) {
        if (movie == null) return
        val heroUrls = ImagePolicyEngine.resolveCandidates(
            movie.backdropUrl,
            movie.posterUrl
        ).take(2)
        if (heroUrls.isEmpty()) return
        if (shouldSkipPrime(debugTag, heroUrls)) return
        preloader.preloadBatchInOrderWithTelemetry("${debugTag}_critical", heroUrls.take(1))
        val secondaryUrls = heroUrls.drop(1)
        if (secondaryUrls.isNotEmpty()) {
            preloader.preloadBatch(secondaryUrls)
        }
    }

    @MainThread
    fun onCardFocused(
        laneKey: String = "default",
        currentIndex: Int,
        items: List<MovieMetadata>,
        prefetchCount: Int = 12,
        backwardBufferCount: Int = 4
    ) {
        if (currentIndex !in items.indices) return
        val now = System.currentTimeMillis()
        val resolvedLane = laneKey.ifBlank { "default" }
        val previous = focusStateByLane[resolvedLane]
        if (previous != null && previous.index == currentIndex && now - previous.atMs < sameIndexCooldownMs) {
            return
        }

        if (previous != null && now - previous.atMs < focusThrottleMs) {
            preloader.preloadBatch(buildImageCandidates(items[currentIndex]).take(1))
            focusStateByLane[resolvedLane] = FocusPrefetchState(index = currentIndex, atMs = now)
            return
        }
        focusStateByLane[resolvedLane] = FocusPrefetchState(index = currentIndex, atMs = now)
        if (focusStateByLane.size > 32) {
            val oldest = focusStateByLane.entries.firstOrNull()?.key
            if (oldest != null) focusStateByLane.remove(oldest)
        }

        val focused = items[currentIndex]
        val partitionKey = partitionKeyFromUrls(buildImageCandidates(focused))
        val adjustedForward = PreloadBackpressure.adjustCount(prefetchCount, min = 3, partitionKey = partitionKey)
        val adjustedBackward = PreloadBackpressure.adjustCount(backwardBufferCount, min = 1, partitionKey = partitionKey)
        val nextItems = items.drop(currentIndex + 1).take(adjustedForward)
        val prevItems = items.take(currentIndex).takeLast(adjustedBackward.coerceAtLeast(0))

        val candidates = buildList {
            addAll(buildImageCandidates(focused))
            addAll(nextItems.flatMap(::buildImageCandidates))
            addAll(prevItems.flatMap(::buildImageCandidates))
        }.distinct()
            .take(maxUrlsPerFocusPrefetch)

        preloader.preloadBatch(candidates)
    }

    private fun MutableList<String>.addPreferredImageCandidates(movie: MovieMetadata) {
        addAll(buildCardImageCandidates(movie))
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

    private fun buildCardImageCandidates(movie: MovieMetadata): List<String> {
        val preferred = HeroImageResolver.normalizeImageUrl(movie.posterUrl)
            ?: HeroImageResolver.normalizeImageUrl(movie.backdropUrl)
        return preferred?.let(::listOf) ?: emptyList()
    }

    private fun shouldSkipPrime(debugTag: String, criticalUrls: List<String>): Boolean {
        val signature = criticalUrls.joinToString(separator = "|").hashCode()
        val now = System.currentTimeMillis()
        val previous = primeSignatureByTag[debugTag]
        val isDuplicate = previous != null &&
            previous.first == signature &&
            now - previous.second < primeDedupWindowMs
        primeSignatureByTag[debugTag] = signature to now
        if (primeSignatureByTag.size > 24) {
            val oldest = primeSignatureByTag.entries.firstOrNull()?.key
            if (oldest != null) primeSignatureByTag.remove(oldest)
        }
        return isDuplicate
    }

    private fun partitionKeyFromUrls(urls: List<String>): String {
        val host = urls.asSequence()
            .mapNotNull { url -> runCatching { URI(url).host?.lowercase() }.getOrNull() }
            .firstOrNull { !it.isNullOrBlank() }
        return host ?: "global"
    }
}
