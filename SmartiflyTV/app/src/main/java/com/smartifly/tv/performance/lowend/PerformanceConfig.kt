package com.smartifly.tv.performance.lowend

data class PerformanceConfig(
    val tier: DeviceTier,
    val showCardGlow: Boolean,
    val preloadWindowSize: Int,
    val enableHeavyBlur: Boolean,
    val epgVisibleDays: Int,
    val animationDurationMultiplier: Float,
    val preferredImageQuality: String // "low", "medium", "high"
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
                preferredImageQuality = "low"
            )
            DeviceTier.MEDIUM -> PerformanceConfig(
                tier = tier,
                showCardGlow = true,
                preloadWindowSize = 5,
                enableHeavyBlur = true,
                epgVisibleDays = 3,
                animationDurationMultiplier = 0.8f,
                preferredImageQuality = "medium"
            )
            DeviceTier.HIGH -> PerformanceConfig(
                tier = tier,
                showCardGlow = true,
                preloadWindowSize = 10,
                enableHeavyBlur = true,
                epgVisibleDays = 7,
                animationDurationMultiplier = 1.0f,
                preferredImageQuality = "high"
            )
        }
    }
}
