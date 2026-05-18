package com.smartifly.tv.data.hero

import com.smartifly.tv.data.models.MovieMetadata
import kotlin.math.max

/**
 * Owns deterministic home-hero selection.
 * Session-stable: once a hero is selected for a profile, it remains preferred
 * until it becomes unavailable in the next candidate set.
 */
class HeroRepository : HomeHeroSelector {

    private val lockedHeroByProfile = mutableMapOf<String, String>()

    override fun selectHomeHero(
        profileId: String,
        continueWatching: List<MovieMetadata>,
        movies: List<MovieMetadata>,
        series: List<MovieMetadata>
    ): MovieMetadata? {
        val resumeVod = continueWatching.firstOrNull { it.type != "live" && it.hasVisualAsset() }
        if (resumeVod != null) {
            android.util.Log.i(
                "SmartiflyHero",
                "hero_selected profile=$profileId source=continue_watching id=${resumeVod.id} type=${resumeVod.type}"
            )
            lock(profileId, resumeVod.id)
            return resumeVod
        }

        val candidates = (movies + series).filter { it.type != "live" && it.hasVisualAsset() }
        if (candidates.isEmpty()) {
            android.util.Log.w(
                "SmartiflyHero",
                "hero_candidate_count=0 profile=$profileId reason=no_visual_assets"
            )
            return null
        }

        val lockedId = lockedHeroByProfile[profileId]
        if (!lockedId.isNullOrBlank()) {
            candidates.firstOrNull { it.id == lockedId }?.let {
                android.util.Log.i(
                    "SmartiflyHero",
                    "hero_selected profile=$profileId source=session_lock id=${it.id} type=${it.type}"
                )
                return it
            }
        }

        val window = candidates.take(max(1, minOf(12, candidates.size)))
        val picked = window.maxByOrNull { it.rating.toDoubleOrNull() ?: 0.0 } ?: candidates.first()
        android.util.Log.i(
            "SmartiflyHero",
            "hero_selected profile=$profileId source=rated_window id=${picked.id} type=${picked.type} candidate_count=${candidates.size}"
        )
        lock(profileId, picked.id)
        return picked
    }

    private fun lock(profileId: String, heroId: String) {
        if (profileId.isNotBlank() && heroId.isNotBlank()) {
            lockedHeroByProfile[profileId] = heroId
        }
    }

    private fun MovieMetadata.hasVisualAsset(): Boolean {
        return backdropUrl.isNotBlank() || posterUrl.isNotBlank()
    }
}
