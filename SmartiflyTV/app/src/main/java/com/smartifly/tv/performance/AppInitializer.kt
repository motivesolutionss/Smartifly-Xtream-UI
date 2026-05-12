package com.smartifly.tv.performance

import android.content.Context
import com.smartifly.tv.data.SettingsManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object AppInitializer {
    private var isInitialized = false

    fun initialize(context: Context, scope: CoroutineScope) {
        if (isInitialized) return
        
        // Critical startup tasks (Blocking/Main thread)
        // Initialize Settings early for theme
        SettingsManager(context)
        
        // Initialize Analytics & Stability monitoring
        com.smartifly.tv.analytics.TelemetryManager.initialize(context)
        com.smartifly.tv.data.image.ProviderHealthTelemetry.initialize(context)
        val perfConfig = com.smartifly.tv.performance.lowend.LowEndModeManager.getConfig()
        com.smartifly.tv.analytics.TelemetryManager.setDeviceContext(
            deviceId = android.provider.Settings.Secure.getString(context.contentResolver, android.provider.Settings.Secure.ANDROID_ID) ?: "unknown",
            performanceTier = if (perfConfig.tier == com.smartifly.tv.performance.lowend.DeviceTier.LOW) "Low-End" else "High-End"
        )

        // Initialize TV Launcher Channels
        com.smartifly.tv.tvlauncher.TvLauncherSyncWorker.schedule(context)
        com.smartifly.tv.tvlauncher.TvLauncherSyncWorker.runOnce(context)

        // Non-critical startup tasks (Background thread)
        scope.launch(Dispatchers.IO) {
            // 2. Pre-warm DataStore
            // 3. Clear temp caches
            // 4. Set up analytics/reporting if needed
        }

        isInitialized = true
    }
}
