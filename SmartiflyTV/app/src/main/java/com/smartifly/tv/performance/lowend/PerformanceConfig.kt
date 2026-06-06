package com.smartifly.tv.performance.lowend

data class PerformanceConfig(
    val tier: DeviceTier,
    val showCardGlow: Boolean,
    val preloadWindowSize: Int,
    val enableHeavyBlur: Boolean,
    val epgVisibleDays: Int,
    val animationDurationMultiplier: Float,
    val preferredImageQuality: String, // "low", "medium", "high"
    val homeMotion: HomeMotionConfig
) {
    companion object {
        fun fromTier(tier: DeviceTier) = when (tier) {
            DeviceTier.LOW -> PerformanceConfig(
                tier = tier,
                showCardGlow = false,
                preloadWindowSize = 2,
                enableHeavyBlur = false,
                epgVisibleDays = 1,
                animationDurationMultiplier = 0.5f,
                preferredImageQuality = "low",
                homeMotion = HomeMotionConfig(
                    holdThreshold = 0.16f,
                    hideThreshold = 0.36f,
                    hideTranslationMultiplier = 1.02f,
                    hideAlphaMultiplier = 2.4f,
                    hideScaleDelta = 0f,
                    heroVisibleThreshold = 0.44f
                )
            )
            DeviceTier.MEDIUM -> PerformanceConfig(
                tier = tier,
                showCardGlow = true,
                preloadWindowSize = 5,
                enableHeavyBlur = true,
                epgVisibleDays = 3,
                animationDurationMultiplier = 0.8f,
                preferredImageQuality = "medium",
                homeMotion = HomeMotionConfig(
                    holdThreshold = 0.12f,
                    hideThreshold = 0.34f,
                    hideTranslationMultiplier = 1.05f,
                    hideAlphaMultiplier = 2.8f,
                    hideScaleDelta = 0.04f,
                    heroVisibleThreshold = 0.46f
                )
            )
            DeviceTier.HIGH -> PerformanceConfig(
                tier = tier,
                showCardGlow = true,
                preloadWindowSize = 10,
                enableHeavyBlur = true,
                epgVisibleDays = 7,
                animationDurationMultiplier = 1.0f,
                preferredImageQuality = "high",
                homeMotion = HomeMotionConfig(
                    holdThreshold = 0.12f,
                    hideThreshold = 0.34f,
                    hideTranslationMultiplier = 1.05f,
                    hideAlphaMultiplier = 2.8f,
                    hideScaleDelta = 0.04f,
                    heroVisibleThreshold = 0.46f
                )
            )
        }
    }
}

data class HomeMotionConfig(
    val holdThreshold: Float,
    val hideThreshold: Float,
    val hideTranslationMultiplier: Float,
    val hideAlphaMultiplier: Float,
    val hideScaleDelta: Float,
    val heroVisibleThreshold: Float
)
