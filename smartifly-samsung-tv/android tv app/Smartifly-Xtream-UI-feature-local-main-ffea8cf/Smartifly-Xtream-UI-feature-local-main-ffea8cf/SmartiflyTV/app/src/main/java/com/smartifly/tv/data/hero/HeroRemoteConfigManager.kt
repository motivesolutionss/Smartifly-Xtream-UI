package com.smartifly.tv.data.hero

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import com.google.firebase.remoteconfig.ktx.remoteConfigSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object HeroRemoteConfigManager {
    private var initialized = false

    private const val K_RATING_WEIGHT = "hero_rating_weight"
    private const val K_RECENCY_WEIGHT = "hero_recency_weight"
    private const val K_METADATA_WEIGHT = "hero_metadata_weight"
    private const val K_CONTINUE_BOOST = "hero_continue_watching_boost"
    private const val K_DIVERSITY_PENALTY = "hero_diversity_penalty"
    private const val K_COOLDOWN_PENALTY = "hero_cooldown_penalty"
    private const val K_TOP_WINDOW_SIZE = "hero_top_window_size"
    private const val K_COOLDOWN_HOURS = "hero_cooldown_hours"
    private const val K_HISTORY_DEPTH = "hero_history_depth"

    fun initialize(context: Context, scope: CoroutineScope) {
        if (initialized) return
        initialized = true

        scope.launch(Dispatchers.IO) {
            val firebaseReady = runCatching { FirebaseApp.initializeApp(context) }.getOrNull() != null
            if (!firebaseReady) return@launch

            val config = FirebaseRemoteConfig.getInstance()
            val defaults = mapOf(
                K_RATING_WEIGHT to HeroRepository.currentTuning().ratingWeight,
                K_RECENCY_WEIGHT to HeroRepository.currentTuning().recencyWeight,
                K_METADATA_WEIGHT to HeroRepository.currentTuning().metadataBonusWeight,
                K_CONTINUE_BOOST to HeroRepository.currentTuning().continueWatchingBoost,
                K_DIVERSITY_PENALTY to HeroRepository.currentTuning().diversityPenalty,
                K_COOLDOWN_PENALTY to HeroRepository.currentTuning().cooldownPenalty,
                K_TOP_WINDOW_SIZE to HeroRepository.currentTuning().topWindowSize.toLong(),
                K_COOLDOWN_HOURS to HeroRepository.currentTuning().cooldownHours.toLong(),
                K_HISTORY_DEPTH to HeroRepository.currentTuning().historyDepth.toLong()
            )
            config.setDefaultsAsync(defaults)
            config.setConfigSettingsAsync(
                remoteConfigSettings {
                    // Fast iteration in debug, conservative in release.
                    minimumFetchIntervalInSeconds = if (com.smartifly.tv.BuildConfig.DEBUG) 0 else 21_600
                    fetchTimeoutInSeconds = 6
                }
            )

            config.fetchAndActivate()
                .addOnCompleteListener {
                    applyRemoteValues(config)
                }
                .addOnFailureListener {
                    // Keep local defaults if fetch fails.
                }
        }
    }

    private fun applyRemoteValues(config: FirebaseRemoteConfig) {
        val current = HeroRepository.currentTuning()
        HeroRepository.updateTuning(
            HeroRepository.HeroTuning(
                ratingWeight = config.getDouble(K_RATING_WEIGHT).coerceIn(0.0, 6.0),
                recencyWeight = config.getDouble(K_RECENCY_WEIGHT).coerceIn(0.0, 6.0),
                metadataBonusWeight = config.getDouble(K_METADATA_WEIGHT).coerceIn(0.0, 6.0),
                continueWatchingBoost = config.getDouble(K_CONTINUE_BOOST).coerceIn(0.0, 10.0),
                diversityPenalty = config.getDouble(K_DIVERSITY_PENALTY).coerceIn(0.0, 8.0),
                cooldownPenalty = config.getDouble(K_COOLDOWN_PENALTY).coerceIn(0.0, 12.0),
                topWindowSize = config.getLong(K_TOP_WINDOW_SIZE).toInt().coerceIn(2, 20),
                cooldownHours = config.getLong(K_COOLDOWN_HOURS).toInt().coerceIn(1, 168),
                historyDepth = config.getLong(K_HISTORY_DEPTH).toInt().coerceIn(1, 12)
            ).let { tuned ->
                // Preserve current tuning if remote values are all unset/zeroed by mistake.
                if (tuned == HeroRepository.HeroTuning()) current else tuned
            }
        )
    }
}

