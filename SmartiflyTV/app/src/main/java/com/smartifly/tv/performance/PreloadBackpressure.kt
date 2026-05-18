package com.smartifly.tv.performance

import java.util.concurrent.atomic.AtomicReference

object PreloadBackpressure {
    enum class Mode { NORMAL, CONSTRAINED }

    private data class State(
        val mode: Mode,
        val failRate: Float,
        val avgDurationMs: Long
    )

    private val stateRef = AtomicReference(State(mode = Mode.NORMAL, failRate = 0f, avgDurationMs = 0L))

    data class Snapshot(
        val mode: Mode,
        val failRate: Float,
        val avgDurationMs: Long
    )

    fun onBatchTelemetry(total: Int, failures: Int, durationMs: Long) {
        if (total <= 0) return
        val failRate = failures.toFloat() / total.toFloat()
        val avgDuration = (durationMs / total.toLong()).coerceAtLeast(1L)
        val constrained = failRate >= 0.45f || avgDuration >= 1100L
        stateRef.set(
            State(
                mode = if (constrained) Mode.CONSTRAINED else Mode.NORMAL,
                failRate = failRate,
                avgDurationMs = avgDuration
            )
        )
    }

    fun mode(): Mode = stateRef.get().mode

    fun snapshot(): Snapshot {
        val state = stateRef.get()
        return Snapshot(
            mode = state.mode,
            failRate = state.failRate,
            avgDurationMs = state.avgDurationMs
        )
    }

    fun adjustCount(base: Int, min: Int = 4): Int {
        if (base <= 0) return 0
        return if (mode() == Mode.CONSTRAINED) {
            maxOf(min, (base * 0.6f).toInt())
        } else {
            base
        }
    }
}
