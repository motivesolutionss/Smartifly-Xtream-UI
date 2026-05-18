package com.smartifly.tv.data.image

import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Lightweight runtime telemetry for image host quality.
 * No blocking IO, no persistence: safe for showcase/runtime diagnostics.
 */
object ImageQualityMonitor {
    private val successByHost = ConcurrentHashMap<String, AtomicInteger>()
    private val failureByHost = ConcurrentHashMap<String, AtomicInteger>()
    private val successByContext = ConcurrentHashMap<String, AtomicInteger>()
    private val failureByContext = ConcurrentHashMap<String, AtomicInteger>()
    private val eventCounter = AtomicInteger(0)
    private const val SUMMARY_EVERY_EVENTS = 50

    data class HostHealth(
        val host: String,
        val successes: Int,
        val failures: Int,
        val total: Int,
        val failureRatePercent: Int
    )

    object Context {
        const val HOME_HERO = "HOME_HERO"
        const val HOME_POSTER = "HOME_POSTER"
        const val CONTINUE_WATCHING = "CONTINUE_WATCHING"
        const val DETAILS = "DETAILS"
        const val LIVE_CARD = "LIVE_CARD"
        const val SEARCH = "SEARCH"
    }

    fun recordSuccess(
        url: String,
        context: String = Context.HOME_POSTER,
        profileId: String? = null,
        contentType: String? = null,
        contentId: String? = null
    ) {
        hostOf(url)?.let { host ->
            successByHost.computeIfAbsent(host) { AtomicInteger(0) }.incrementAndGet()
            successByContext.computeIfAbsent(context) { AtomicInteger(0) }.incrementAndGet()
            ProviderHealthTelemetry.recordEvent(
                eventType = "IMAGE_SUCCESS",
                context = context,
                imageUrl = url,
                profileId = profileId,
                contentType = contentType,
                contentId = contentId
            )
            maybeLogSummary()
        }
    }

    fun recordFailure(
        url: String,
        context: String = Context.HOME_POSTER,
        profileId: String? = null,
        contentType: String? = null,
        contentId: String? = null
    ) {
        hostOf(url)?.let { host ->
            val failures = failureByHost.computeIfAbsent(host) { AtomicInteger(0) }.incrementAndGet()
            failureByContext.computeIfAbsent(context) { AtomicInteger(0) }.incrementAndGet()
            val successes = successByHost[host]?.get() ?: 0
            val total = successes + failures
            ProviderHealthTelemetry.recordEvent(
                eventType = "IMAGE_FAILURE",
                context = context,
                imageUrl = url,
                profileId = profileId,
                contentType = contentType,
                contentId = contentId
            )
            if (total >= 20 && failures * 100 / total >= 35) {
                android.util.Log.w(
                    "SmartiflyImage",
                    "image_host_quality=degraded host=$host failures=$failures successes=$successes fail_rate_pct=${failures * 100 / total}"
                )
            }
            maybeLogSummary()
        }
    }

    fun snapshot(topN: Int = 8): List<HostHealth> {
        val hosts = (successByHost.keys + failureByHost.keys).toSet()
        return hosts.map { host ->
            val successes = successByHost[host]?.get() ?: 0
            val failures = failureByHost[host]?.get() ?: 0
            val total = successes + failures
            val rate = if (total == 0) 0 else (failures * 100 / total)
            HostHealth(
                host = host,
                successes = successes,
                failures = failures,
                total = total,
                failureRatePercent = rate
            )
        }.sortedWith(
            compareByDescending<HostHealth> { it.total }
                .thenByDescending { it.failureRatePercent }
        ).take(topN)
    }

    fun runtimeScoreAdjustment(url: String): Int {
        val host = hostOf(url) ?: return 0
        val successes = successByHost[host]?.get() ?: 0
        val failures = failureByHost[host]?.get() ?: 0
        val total = successes + failures
        if (total < 6) return 0

        val successRate = successes.toFloat() / total.toFloat()
        return when {
            successRate >= 0.85f -> 16
            successRate >= 0.70f -> 8
            successRate <= 0.25f -> -24
            successRate <= 0.40f -> -12
            else -> 0
        }
    }

    private fun hostOf(url: String): String? {
        return try {
            URI(url).host?.lowercase()
        } catch (_: Exception) {
            null
        }
    }

    private fun maybeLogSummary() {
        val events = eventCounter.incrementAndGet()
        if (events % SUMMARY_EVERY_EVENTS != 0) return
        val topContexts = (successByContext.keys + failureByContext.keys)
            .toSet()
            .map { ctx ->
                val s = successByContext[ctx]?.get() ?: 0
                val f = failureByContext[ctx]?.get() ?: 0
                val t = s + f
                val r = if (t == 0) 0 else (f * 100 / t)
                "$ctx:$f/$t($r%)"
            }
            .sortedByDescending { entry ->
                entry.substringAfter(':').substringBefore('/').toIntOrNull() ?: 0
            }
            .take(5)
            .joinToString(" ")
        android.util.Log.i(
            "SmartiflyImage",
            "image_kpi events=$events contexts=[$topContexts]"
        )
    }
}
