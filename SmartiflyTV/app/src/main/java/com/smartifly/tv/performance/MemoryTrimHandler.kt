package com.smartifly.tv.performance

import android.content.ComponentCallbacks2
import android.content.Context
import android.content.res.Configuration
import coil.imageLoader

class MemoryTrimHandler(private val context: Context) : ComponentCallbacks2 {

    fun register() {
        context.registerComponentCallbacks(this)
    }

    fun unregister() {
        context.unregisterComponentCallbacks(this)
    }

    override fun onTrimMemory(level: Int) {
        when (level) {
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> {
                // Clear image memory cache immediately
                context.imageLoader.memoryCache?.clear()
            }
            ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> {
                // App went to background, clear some cache
                context.imageLoader.memoryCache?.trimMemory(level)
            }
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {}
    override fun onLowMemory() {
        context.imageLoader.memoryCache?.clear()
    }
}
