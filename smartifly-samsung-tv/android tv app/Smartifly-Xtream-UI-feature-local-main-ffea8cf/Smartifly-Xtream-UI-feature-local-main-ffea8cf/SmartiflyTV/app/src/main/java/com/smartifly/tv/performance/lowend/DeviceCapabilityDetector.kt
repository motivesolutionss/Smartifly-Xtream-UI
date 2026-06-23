package com.smartifly.tv.performance.lowend

import android.app.ActivityManager
import android.content.Context
import android.os.Build

enum class DeviceTier {
    LOW, MEDIUM, HIGH
}

object DeviceCapabilityDetector {
    fun detectTier(context: Context): DeviceTier {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        
        val totalRamGb = memoryInfo.totalMem / (1024 * 1024 * 1024).toDouble()
        val cores = Runtime.getRuntime().availableProcessors()
        
        return when {
            totalRamGb <= 1.5 || cores <= 4 -> DeviceTier.LOW
            totalRamGb <= 3.0 -> DeviceTier.MEDIUM
            else -> DeviceTier.HIGH
        }
    }
}
