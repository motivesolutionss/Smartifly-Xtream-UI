package com.smartifly.tv.analytics

import android.content.Context
import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

object TelemetryManager {
    private var firebaseAnalytics: FirebaseAnalytics? = null
    private var crashlytics: FirebaseCrashlytics? = null
    private val cacheCounters = ConcurrentHashMap<String, AtomicLong>()

    fun initialize(context: Context) {
        val firebaseReady = runCatching { FirebaseApp.initializeApp(context) }.getOrNull() != null
        if (!firebaseReady) return

        if (firebaseAnalytics == null) {
            firebaseAnalytics = FirebaseAnalytics.getInstance(context)
        }
        if (crashlytics == null) {
            crashlytics = FirebaseCrashlytics.getInstance()
        }
    }

    /**
     * Tracks a custom event in Firebase Analytics.
     */
    fun trackEvent(eventName: String, params: Map<String, String>? = null) {
        val bundle = params?.let {
            Bundle().apply {
                for ((key, value) in it) {
                    putString(key, value)
                }
            }
        }
        firebaseAnalytics?.logEvent(eventName, bundle)
    }

    /**
     * Logs a message or a non-fatal exception to Firebase Crashlytics.
     */
    fun logError(message: String, throwable: Throwable? = null) {
        crashlytics?.log(message)
        throwable?.let { crashlytics?.recordException(it) }
    }

    /**
     * Sets a user ID for both Analytics and Crashlytics.
     */
    fun setUserContext(userId: String) {
        firebaseAnalytics?.setUserId(userId)
        crashlytics?.setUserId(userId)
    }

    /**
     * Sets custom keys for Crashlytics to help debug crashes on specific hardware.
     */
    fun setDeviceContext(deviceId: String, performanceTier: String) {
        crashlytics?.setCustomKey("device_id", deviceId)
        crashlytics?.setCustomKey("performance_tier", performanceTier)
    }
    
    /**
     * Helper to track screen views manually if automatic tracking is insufficient.
     */
    fun trackScreenView(screenName: String, screenClass: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName)
            putString(FirebaseAnalytics.Param.SCREEN_CLASS, screenClass)
        }
        firebaseAnalytics?.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params)
    }

    fun trackTiming(eventName: String, durationMs: Long, extra: Map<String, String> = emptyMap()) {
        val params = extra.toMutableMap()
        params["duration_ms"] = durationMs.coerceAtLeast(0L).toString()
        trackEvent(eventName, params)
    }

    fun trackCacheProbe(domain: String, hit: Boolean) {
        val keyBase = domain.lowercase()
        val total = cacheCounters.computeIfAbsent("${keyBase}_total") { AtomicLong(0L) }.incrementAndGet()
        val hits = if (hit) {
            cacheCounters.computeIfAbsent("${keyBase}_hit") { AtomicLong(0L) }.incrementAndGet()
        } else {
            cacheCounters.computeIfAbsent("${keyBase}_hit") { AtomicLong(0L) }.get()
        }
        if (total % 20L == 0L) {
            val ratioPct = if (total > 0L) ((hits * 100.0) / total).toInt() else 0
            trackEvent(
                "cache_hit_ratio_${keyBase}",
                mapOf(
                    "hits" to hits.toString(),
                    "total" to total.toString(),
                    "ratio_pct" to ratioPct.toString()
                )
            )
        }
    }
}
