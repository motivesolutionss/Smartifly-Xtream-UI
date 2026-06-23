package com.smartifly.tv.data.hero

import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.models.MovieMetadata
import java.util.ArrayDeque
import java.util.Calendar
import kotlin.math.max

/**
 * Owns deterministic home-hero selection.
 * Enterprise-grade behavior:
 * 1) Rank candidates by quality/relevance.
 * 2) Rotate within top-ranked window on each reload to avoid stale "same hero forever".
 * 3) Keep outcome deterministic within each evaluation (no jitter while rendering).
 */
class HeroRepository : HomeHeroSelector {

    data class HeroTuning(
        val ratingWeight: Double = 1.8,
        val recencyWeight: Double = 1.0,
        val metadataBonusWeight: Double = 1.0,
        val continueWatchingBoost: Double = 3.0,
        val diversityPenalty: Double = 1.2,
        val cooldownPenalty: Double = 2.5,
        val topWindowSize: Int = 8,
        val cooldownHours: Int = 24,
        val historyDepth: Int = 4
    )

    companion object {
        @Volatile
        private var tuning: HeroTuning = HeroTuning()

        fun updateTuning(newTuning: HeroTuning) {
            tuning = newTuning
        }

        fun currentTuning(): HeroTuning = tuning
    }

    private val rotationIndexByProfile = mutableMapOf<String, Int>()
    private val lastServedHeroByProfile = mutableMapOf<String, String>()
    private val lastServedAtMsByProfile = mutableMapOf<String, Long>()
    private val recentGenresByProfile = mutableMapOf<String, ArrayDeque<String>>()
    private val recentCategoriesByProfile = mutableMapOf<String, ArrayDeque<String>>()

    override fun selectHomeHero(
        profileId: String,
        continueWatching: List<MovieMetadata>,
        movies: List<MovieMetadata>,
        series: List<MovieMetadata>
    ): MovieMetadata? {
        val resumeVod = continueWatching.firstOrNull { it.type != "live" && it.hasVisualAsset() }
        val candidates = (movies + series)
            .asSequence()
            .filter { it.type != "live" && it.hasVisualAsset() }
            .distinctBy { it.id }
            .toList()

        if (candidates.isEmpty()) {
            android.util.Log.w(
                "SmartiflyHero",
                "hero_candidate_count=0 profile=$profileId reason=no_visual_assets"
            )
            return null
        }

        val now = System.currentTimeMillis()
        val profileTuning = currentTuning()
        val ranked = candidates
            .sortedByDescending { heroScore(it, resumeVod, profileId, now, profileTuning) }

        val windowSize = max(1, minOf(profileTuning.topWindowSize.coerceAtLeast(1), ranked.size))
        val window = ranked.take(windowSize)

        val nextIndex = ((rotationIndexByProfile[profileId] ?: -1) + 1).mod(window.size)
        rotationIndexByProfile[profileId] = nextIndex

        val lastHeroId = lastServedHeroByProfile[profileId]
        val rotated = window.drop(nextIndex) + window.take(nextIndex)
        val picked = if (window.size > 1 && !lastHeroId.isNullOrBlank()) {
            rotated.firstOrNull { it.id != lastHeroId } ?: rotated.first()
        } else {
            rotated.first()
        }

        lastServedHeroByProfile[profileId] = picked.id
        lastServedAtMsByProfile[profileId] = now
        pushRecent(recentGenresByProfile, profileId, firstGenreOf(picked), profileTuning.historyDepth)
        pushRecent(recentCategoriesByProfile, profileId, picked.categoryId, profileTuning.historyDepth)

        val source = when {
            resumeVod != null && picked.id == resumeVod.id -> "continue_watching_weighted"
            else -> "ranked_rotation"
        }
        android.util.Log.i(
            "SmartiflyHero",
            "hero_selected profile=$profileId source=$source id=${picked.id} type=${picked.type} candidate_count=${candidates.size} window_size=$windowSize rotate_index=$nextIndex"
        )

        return picked
    }

    private fun heroScore(
        candidate: MovieMetadata,
        resumeVod: MovieMetadata?,
        profileId: String,
        nowMs: Long,
        tuning: HeroTuning
    ): Double {
        var score = 0.0

        val rating = candidate.rating.toDoubleOrNull() ?: 0.0
        score += rating * tuning.ratingWeight

        score += recencyBonus(candidate.year) * tuning.recencyWeight

        if (candidate.description.isNotBlank()) score += 0.6 * tuning.metadataBonusWeight
        if (candidate.qualityLabel.isNotBlank()) score += 0.4 * tuning.metadataBonusWeight
        if (hasUsableBackdrop(candidate)) score += 0.75 * tuning.metadataBonusWeight
        else if (hasUsablePoster(candidate)) score += 0.25 * tuning.metadataBonusWeight

        if (resumeVod?.id == candidate.id) {
            score += tuning.continueWatchingBoost
        }

        val profileGenreHistory = recentGenresByProfile[profileId]
        val profileCategoryHistory = recentCategoriesByProfile[profileId]
        val candidateGenre = firstGenreOf(candidate)

        if (!candidateGenre.isNullOrBlank() && profileGenreHistory?.contains(candidateGenre) == true) {
            score -= tuning.diversityPenalty
        }
        if (candidate.categoryId.isNotBlank() && profileCategoryHistory?.contains(candidate.categoryId) == true) {
            score -= tuning.diversityPenalty * 0.85
        }

        val lastHeroId = lastServedHeroByProfile[profileId]
        val lastAt = lastServedAtMsByProfile[profileId]
        if (lastHeroId == candidate.id && lastAt != null) {
            val cooldownMs = tuning.cooldownHours.coerceAtLeast(1) * 60L * 60L * 1000L
            if (nowMs - lastAt < cooldownMs) {
                score -= tuning.cooldownPenalty
            }
        }

        return score
    }

    private fun recencyBonus(yearText: String): Double {
        val year = yearText.toIntOrNull() ?: return 0.0
        val now = Calendar.getInstance().get(Calendar.YEAR)
        val age = now - year
        return when {
            age <= 0 -> 3.0
            age <= 1 -> 2.5
            age <= 3 -> 1.7
            age <= 6 -> 0.8
            else -> 0.0
        }
    }

    private fun MovieMetadata.hasVisualAsset(): Boolean {
        return ImagePolicyEngine.resolveFirstUsable(backdropUrl, posterUrl) != null
    }

    private fun hasUsableBackdrop(movie: MovieMetadata): Boolean {
        return ImagePolicyEngine.resolveFirstUsable(movie.backdropUrl) != null
    }

    private fun hasUsablePoster(movie: MovieMetadata): Boolean {
        return ImagePolicyEngine.resolveFirstUsable(movie.posterUrl) != null
    }

    private fun firstGenreOf(movie: MovieMetadata): String? {
        return movie.genre
            .split(",", "/", "|")
            .map { it.trim().lowercase() }
            .firstOrNull { it.isNotBlank() }
    }

    private fun pushRecent(
        map: MutableMap<String, ArrayDeque<String>>,
        profileId: String,
        value: String?,
        maxDepth: Int
    ) {
        if (profileId.isBlank() || value.isNullOrBlank()) return
        val queue = map.getOrPut(profileId) { ArrayDeque() }
        queue.remove(value)
        queue.addFirst(value)
        while (queue.size > maxDepth.coerceAtLeast(1)) {
            queue.removeLast()
        }
    }
}
