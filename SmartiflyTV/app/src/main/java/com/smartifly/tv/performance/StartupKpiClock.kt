package com.smartifly.tv.performance

import android.os.SystemClock
import java.util.concurrent.ConcurrentHashMap

object StartupKpiClock {
    private val marks = ConcurrentHashMap<String, Long>()
    val processStartElapsedMs: Long = SystemClock.elapsedRealtime()

    fun mark(name: String) {
        marks[name] = SystemClock.elapsedRealtime()
    }

    fun elapsedSinceStartMs(): Long = SystemClock.elapsedRealtime() - processStartElapsedMs

    fun elapsedSinceMarkMs(name: String): Long? {
        val start = marks[name] ?: return null
        return (SystemClock.elapsedRealtime() - start).coerceAtLeast(0L)
    }
}
