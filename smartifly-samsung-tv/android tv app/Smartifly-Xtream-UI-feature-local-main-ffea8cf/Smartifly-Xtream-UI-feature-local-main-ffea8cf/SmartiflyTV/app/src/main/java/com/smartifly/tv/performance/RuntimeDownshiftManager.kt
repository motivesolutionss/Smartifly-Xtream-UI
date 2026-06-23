@file:Suppress("DEPRECATION")

package com.smartifly.tv.performance

import android.content.ComponentCallbacks2
import com.smartifly.tv.BuildConfig

object RuntimeDownshiftManager {
    @Volatile
    private var level: Int = 0

    /**
     * Responds to system memory pressure events.
     * Maps ComponentCallbacks2 memory trim levels to downshift scale levels.
     * Downshifts are reversible, allowing the application to recover cache capacity if pressure eases.
     */
    fun onMemoryPressure(trimLevel: Int) {
        // Modern memory levels are prioritized. Legacy RUNNING_* levels serve as fallback.
        val next = when {
            // Level 2 (Scale 0.5f) - Critical background low memory or critical foreground low memory
            trimLevel >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> 2
            
            // Level 1 (Scale 0.75f) - Moderate background or standard background or UI hidden
            trimLevel >= ComponentCallbacks2.TRIM_MEMORY_MODERATE -> 1
            trimLevel >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND -> 1
            trimLevel >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> 1
            
            // Legacy fallbacks for foreground running states
            trimLevel >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> 2
            trimLevel >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> 1
            
            // Default Level 0 (Scale 1.0f)
            else -> 0
        }

        val previous = level
        if (next != previous) {
            level = next
            if (BuildConfig.LIVE_DEBUG_TRACE) {
                android.util.Log.w("SmartiflyCache", "runtime_downshift level changed from $previous to $level (trimLevel=$trimLevel)")
            }
        }
    }

    fun currentScale(): Float {
        return when (level) {
            2 -> 0.5f
            1 -> 0.75f
            else -> 1.0f
        }
    }

    fun currentLevel(): Int = level

    fun scaledInt(base: Int, min: Int): Int {
        val scaled = (base * currentScale()).toInt()
        return scaled.coerceAtLeast(min).coerceAtMost(base)
    }

    internal fun resetForTests() {
        level = 0
    }
}
