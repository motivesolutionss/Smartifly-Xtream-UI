package com.smartifly.tv.performance

import android.content.Context
import androidx.annotation.MainThread

/**
 * Process-wide prefetch coordinator.
 * Ensures all screens share the same prefetch manager and adaptive state.
 */
object PrefetchOrchestrator {
    @Volatile
    private var manager: RowPrefetchManager? = null

    @MainThread
    fun manager(context: Context): RowPrefetchManager {
        val existing = manager
        if (existing != null) return existing
        return synchronized(this) {
            val current = manager
            if (current != null) {
                current
            } else {
                RowPrefetchManager(ImagePreloader(context.applicationContext)).also {
                    manager = it
                }
            }
        }
    }
}
