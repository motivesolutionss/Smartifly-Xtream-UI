package com.smartifly.tv.performance

import android.content.Context
import com.smartifly.tv.data.SettingsManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

object AppInitializer {
    private var isInitialized = false

    fun initialize(context: Context, scope: CoroutineScope) {
        if (isInitialized) return

        SettingsManager(context)
        com.smartifly.tv.performance.lowend.LowEndModeManager.initialize(context)

        scope.launch(Dispatchers.Default) {
            delay(350)

            com.smartifly.tv.analytics.TelemetryManager.initialize(context)
            com.smartifly.tv.data.image.ProviderHealthTelemetry.initialize(context)
            com.smartifly.tv.data.image.ImageHostPolicy.initialize(context)
            com.smartifly.tv.data.hero.HeroRemoteConfigManager.initialize(context, scope)

            val perfConfig = com.smartifly.tv.performance.lowend.LowEndModeManager.getConfig()
            com.smartifly.tv.analytics.TelemetryManager.setDeviceContext(
                deviceId = android.provider.Settings.Secure.getString(
                    context.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                ) ?: "unknown",
                performanceTier = if (perfConfig.tier == com.smartifly.tv.performance.lowend.DeviceTier.LOW) {
                    "Low-End"
                } else {
                    "High-End"
                }
            )

            com.smartifly.tv.tvlauncher.TvLauncherSyncWorker.schedule(context)
            com.smartifly.tv.tvlauncher.TvLauncherSyncWorker.runOnceDeferred(context)
        }

        scope.launch(Dispatchers.IO) {
        }

        isInitialized = true
    }
}
