package com.smartifly.tv.features.home

import com.smartifly.tv.data.models.MovieMetadata
import java.time.LocalDate
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.roundToInt
import kotlin.random.Random

object HomeRailRanker {
    data class RailDebug(
        val title: String,
        val totalScore: Double,
        val anchorScore: Double,
        val sizeScore: Double,
        val imageScore: Double,
        val freshnessScore: Double
    )

    data class RankResult(
        val sections: List<HomeSection>,
        val debugTopRails: List<RailDebug>
    )

    fun rank(
        sections: List<HomeSection>,
        profileId: String,
        policy: HomeRailPolicy,
        nowDate: LocalDate = LocalDate.now()
    ): List<HomeSection> {
        return rankWithDiagnostics(sections, profileId, policy, nowDate).sections
    }

    fun rankWithDiagnostics(
        sections: List<HomeSection>,
        profileId: String,
        policy: HomeRailPolicy,
        nowDate: LocalDate = LocalDate.now()
    ): RankResult {
        if (sections.isEmpty()) return RankResult(emptyList(), emptyList())
        val sessionSeed = stableSeed(profileId, nowDate.toString())

        val decorated = sections.mapIndexed { index, section ->
            val breakdown = railScoreBreakdown(section, nowDate)
            val tieBreaker = stableNoise(sessionSeed, section.title, index)
            val itemSeed = stableSeed(profileId, "${nowDate}:${section.title}")
            val diversifiedItems = diversifyItems(section.items, itemSeed)
            val cappedItems = diversifiedItems.take(policy.itemsPerRail)
            RankedRail(
                section = section.copy(items = cappedItems),
                score = breakdown.total + tieBreaker,
                debug = RailDebug(
                    title = section.title,
                    totalScore = breakdown.total + tieBreaker,
                    anchorScore = breakdown.anchorScore,
                    sizeScore = breakdown.sizeScore,
                    imageScore = breakdown.imageScore,
                    freshnessScore = breakdown.freshnessScore
                )
            )
        }

        val sorted = decorated
            .sortedByDescending { it.score }
            .take(policy.totalRailsCap)
        val sortedSections = sorted.map { it.section }
        val debugTop = sorted.take(5).map { it.debug }

        val anchored = applyAnchorGuards(sortedSections)
        val finalSections = applyAntiRepeat(anchored, profileId, sessionSeed)
        return RankResult(
            sections = finalSections,
            debugTopRails = debugTop
        )
    }

    private fun railScoreBreakdown(section: HomeSection, nowDate: LocalDate): RailScoreBreakdown {
        val title = section.title.lowercase()
        val sizeScore = (section.items.size.coerceAtMost(30) / 30.0) * 30.0
        val imageReadiness = section.items
            .take(18)
            .count { it.posterUrl.isNotBlank() || it.backdropUrl.isNotBlank() }
            .toDouble() / section.items.take(18).size.coerceAtLeast(1).toDouble()
        val imageScore = imageReadiness * 25.0
        val freshnessScore = freshnessScore(section.items, nowDate)

        val anchorBoost = when {
            title.contains("continue watching") -> 55.0
            title.contains("live") -> 45.0
            title.contains("movies") -> 38.0
            title.contains("series") -> 36.0
            title.contains("trending") -> 28.0
            else -> 18.0
        }
        val noveltyPenalty = if (title.contains("spotlight")) -4.0 else 0.0
        return RailScoreBreakdown(
            total = anchorBoost + sizeScore + imageScore + freshnessScore + noveltyPenalty,
            anchorScore = anchorBoost,
            sizeScore = sizeScore,
            imageScore = imageScore,
            freshnessScore = freshnessScore
        )
    }

    private fun freshnessScore(items: List<MovieMetadata>, nowDate: LocalDate): Double {
        if (items.isEmpty()) return 0.0
        val nowYear = nowDate.year
        val sample = items.take(24)
        var score = 0.0
        sample.forEach { item ->
            val year = item.year.toIntOrNull() ?: return@forEach
            val age = (nowYear - year).coerceAtLeast(0)
            score += when {
                age <= 1 -> 1.0
                age <= 3 -> 0.7
                age <= 7 -> 0.4
                else -> 0.15
            }
        }
        val normalized = score / sample.size.toDouble()
        return normalized * 18.0
    }

    private fun diversifyItems(items: List<MovieMetadata>, seed: Int): List<MovieMetadata> {
        if (items.size <= 6) return items
        val rng = Random(seed)
        val buckets = linkedMapOf<String, MutableList<MovieMetadata>>()
        items.forEach { item ->
            val key = item.type.ifBlank { "unknown" } + "|" + item.categoryId
            buckets.getOrPut(key) { mutableListOf() }.add(item)
        }
        buckets.values.forEach { it.shuffle(rng) }

        val result = mutableListOf<MovieMetadata>()
        while (result.size < items.size) {
            var added = false
            for ((_, bucket) in buckets) {
                if (bucket.isNotEmpty()) {
                    result += bucket.removeAt(0)
                    added = true
                }
            }
            if (!added) break
        }
        return result
    }

    private fun applyAnchorGuards(sections: List<HomeSection>): List<HomeSection> {
        if (sections.isEmpty()) return sections
        val mutable = sections.toMutableList()

        fun pullToTop(match: (String) -> Boolean, maxIndex: Int) {
            val idx = mutable.indexOfFirst { match(it.title.lowercase()) }
            if (idx > maxIndex) {
                val rail = mutable.removeAt(idx)
                mutable.add(maxIndex, rail)
            }
        }

        pullToTop(match = { it.contains("continue watching") }, maxIndex = 0)
        pullToTop(match = { it.contains("live") }, maxIndex = 2)
        pullToTop(match = { it.contains("movies") }, maxIndex = 3)
        pullToTop(match = { it.contains("series") }, maxIndex = 4)
        return mutable
    }

    private fun stableSeed(a: String, b: String): Int {
        return (a + "|" + b).hashCode()
    }

    private fun stableNoise(seed: Int, title: String, index: Int): Double {
        val mixed = (seed * 31 + title.hashCode() * 17 + index * 13)
        val bounded = (mixed and 0x7fffffff) % 1000
        return (bounded / 1000.0 * 6.0).roundToInt() / 10.0
    }

    private fun applyAntiRepeat(
        sections: List<HomeSection>,
        profileId: String,
        sessionSeed: Int
    ): List<HomeSection> {
        if (sections.size <= 4) return sections
        val signature = sections.take(6).joinToString("|") { it.title.lowercase() }
        val previous = orderMemory[profileId]
        if (previous == signature) {
            // Keep top anchors stable; rotate lower rails to avoid "same order" fatigue.
            val head = sections.take(3)
            val tail = sections.drop(3).toMutableList()
            if (tail.size > 1) {
                val offset = ((sessionSeed and 0x7fffffff) % tail.size).coerceAtLeast(1)
                java.util.Collections.rotate(tail, offset)
            }
            val rotated = head + tail
            orderMemory[profileId] = rotated.take(6).joinToString("|") { it.title.lowercase() }
            return rotated
        }
        orderMemory[profileId] = signature
        return sections
    }

    private val orderMemory = ConcurrentHashMap<String, String>()

    private data class RankedRail(
        val section: HomeSection,
        val score: Double,
        val debug: RailDebug
    )

    private data class RailScoreBreakdown(
        val total: Double,
        val anchorScore: Double,
        val sizeScore: Double,
        val imageScore: Double,
        val freshnessScore: Double
    )
}
