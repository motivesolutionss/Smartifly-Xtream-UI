package com.smartifly.tv.data.image

import java.util.concurrent.ConcurrentHashMap

/**
 * Session-level bad URL memory to avoid repeated image failures.
 */
object ImageFailureMemory {
    private val badUrlUntilEpochMs = ConcurrentHashMap<String, Long>()
    private const val DEFAULT_TTL_MS = 5 * 60 * 1000L

    fun markBad(url: String, ttlMs: Long = DEFAULT_TTL_MS) {
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
}

