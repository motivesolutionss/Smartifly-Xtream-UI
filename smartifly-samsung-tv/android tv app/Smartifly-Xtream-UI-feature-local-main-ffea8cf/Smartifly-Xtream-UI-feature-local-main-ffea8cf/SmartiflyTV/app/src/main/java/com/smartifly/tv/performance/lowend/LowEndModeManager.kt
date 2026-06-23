package com.smartifly.tv.performance.lowend

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

val LocalPerformanceConfig = staticCompositionLocalOf<PerformanceConfig> {
    PerformanceConfig.fromTier(DeviceTier.MEDIUM)
}

object LowEndModeManager {
    private var currentConfig: PerformanceConfig? = null

    fun initialize(context: Context) {
        val tier = DeviceCapabilityDetector.detectTier(context)
        currentConfig = PerformanceConfig.fromTier(tier)
    }

    fun getConfig(): PerformanceConfig = currentConfig ?: PerformanceConfig.fromTier(DeviceTier.MEDIUM)
}
