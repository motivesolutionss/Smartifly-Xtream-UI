package com.smartifly.tv.data.image

import java.net.URI
import java.util.concurrent.ConcurrentHashMap

/**
 * Session-level bad URL memory to avoid repeated image failures.
 */
object ImageFailureMemory {
    private val badUrlUntilEpochMs = ConcurrentHashMap<String, Long>()
    private val hostFailureState = ConcurrentHashMap<String, HostFailureState>()
    private const val DEFAULT_TTL_MS = 5 * 60 * 1000L
    private const val HOST_BASE_TTL_MS = 10 * 60 * 1000L
    private const val HOST_STRIKE_THRESHOLD = 3
    private const val HOST_MAX_BACKOFF_MS = 60 * 60 * 1000L
    private const val HOST_STRIKE_WINDOW_MS = 5 * 60 * 1000L

    private data class HostFailureState(
        val strikes: Int,
        val lastFailureAtMs: Long,
        val cooldownUntilMs: Long
    )

    fun markBad(url: String, ttlMs: Long = DEFAULT_TTL_MS) {
        if (url.isBlank()) return
        badUrlUntilEpochMs[url] = System.currentTimeMillis() + ttlMs
        markHostFailure(url)
    }

    fun markTemporarilyBad(url: String, ttlMs: Long) {
        if (url.isBlank()) return
        badUrlUntilEpochMs[url] = System.currentTimeMillis() + ttlMs
    }

    fun isBad(url: String): Boolean {
        val expiresAt = badUrlUntilEpochMs[url] ?: return false
        if (expiresAt <= System.currentTimeMillis()) {
            badUrlUntilEpochMs.remove(url)
            return false
        }
        return true
    }

    fun isHostBad(url: String): Boolean {
        val host = extractHost(url) ?: return false
        val state = hostFailureState[host] ?: return false
        if (state.cooldownUntilMs <= System.currentTimeMillis()) {
            if ((System.currentTimeMillis() - state.lastFailureAtMs) > HOST_STRIKE_WINDOW_MS) {
                hostFailureState.remove(host)
            }
            return false
        }
        return true
    }

    fun markHostSuccess(url: String) {
        val host = extractHost(url) ?: return
        hostFailureState.remove(host)
    }

    private fun markHostFailure(url: String) {
        val host = extractHost(url) ?: return
        val now = System.currentTimeMillis()
        val current = hostFailureState[host]
        val strikes = if (current == null || (now - current.lastFailureAtMs) > HOST_STRIKE_WINDOW_MS) {
            1
        } else {
            current.strikes + 1
        }
        if (strikes < HOST_STRIKE_THRESHOLD) {
            hostFailureState[host] = HostFailureState(
                strikes = strikes,
                lastFailureAtMs = now,
                cooldownUntilMs = 0L
            )
            return
        }

        val exponent = (strikes - HOST_STRIKE_THRESHOLD).coerceAtMost(4)
        val ttl = (HOST_BASE_TTL_MS shl exponent).coerceAtMost(HOST_MAX_BACKOFF_MS)
        hostFailureState[host] = HostFailureState(
            strikes = strikes,
            lastFailureAtMs = now,
            cooldownUntilMs = now + ttl
        )
    }

    private fun extractHost(url: String): String? {
        return runCatching { URI(url).host?.lowercase() }.getOrNull()
    }
}
