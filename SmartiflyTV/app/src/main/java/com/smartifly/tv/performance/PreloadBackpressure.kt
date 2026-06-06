package com.smartifly.tv.performance

import java.util.concurrent.atomic.AtomicReference

object PreloadBackpressure {
    enum class Mode { NORMAL, CONSTRAINED }

    private data class State(
        val mode: Mode,
        val failRateEwma: Float,
        val avgDurationMsEwma: Long,
        val constrainedHits: Int,
        val normalHits: Int
    )

    private const val EWMA_ALPHA = 0.24f
    private const val FAIL_RATE_CONSTRAIN_ENTER = 0.42f
    private const val FAIL_RATE_CONSTRAIN_EXIT = 0.27f
    private const val AVG_MS_CONSTRAIN_ENTER = 1000L
    private const val AVG_MS_CONSTRAIN_EXIT = 720L
    private const val ENTER_CONFIRMATION_HITS = 2
    private const val EXIT_CONFIRMATION_HITS = 3

    private val stateRef = AtomicReference(
        State(
            mode = Mode.NORMAL,
            failRateEwma = 0f,
            avgDurationMsEwma = 0L,
            constrainedHits = 0,
            normalHits = 0
        )
    )
    private val stateByPartition = java.util.concurrent.ConcurrentHashMap<String, AtomicReference<State>>()

    data class Snapshot(
        val mode: Mode,
        val failRate: Float,
        val avgDurationMs: Long,
        val constrainedHits: Int,
        val normalHits: Int
    )

    fun onBatchTelemetry(total: Int, failures: Int, durationMs: Long, partitionKey: String = "global") {
        if (total <= 0) return
        val failRate = failures.toFloat() / total.toFloat()
        val avgDuration = (durationMs / total.toLong()).coerceAtLeast(1L)
        val ref = refFor(partitionKey)
        val previous = ref.get()
        val failRateEwma = if (previous.avgDurationMsEwma == 0L) {
            failRate
        } else {
            ewma(previous.failRateEwma, failRate)
        }
        val avgDurationEwma = if (previous.avgDurationMsEwma == 0L) {
            avgDuration
        } else {
            ewma(previous.avgDurationMsEwma.toFloat(), avgDuration.toFloat()).toLong()
        }

        val wantsConstrained = failRateEwma >= FAIL_RATE_CONSTRAIN_ENTER || avgDurationEwma >= AVG_MS_CONSTRAIN_ENTER
        val wantsNormal = failRateEwma <= FAIL_RATE_CONSTRAIN_EXIT && avgDurationEwma <= AVG_MS_CONSTRAIN_EXIT

        val next = when (previous.mode) {
            Mode.NORMAL -> {
                val constrainedHits = if (wantsConstrained) previous.constrainedHits + 1 else 0
                val shouldFlip = constrainedHits >= ENTER_CONFIRMATION_HITS
                State(
                    mode = if (shouldFlip) Mode.CONSTRAINED else Mode.NORMAL,
                    failRateEwma = failRateEwma,
                    avgDurationMsEwma = avgDurationEwma,
                    constrainedHits = if (shouldFlip) 0 else constrainedHits,
                    normalHits = 0
                )
            }

            Mode.CONSTRAINED -> {
                val normalHits = if (wantsNormal) previous.normalHits + 1 else 0
                val shouldFlip = normalHits >= EXIT_CONFIRMATION_HITS
                State(
                    mode = if (shouldFlip) Mode.NORMAL else Mode.CONSTRAINED,
                    failRateEwma = failRateEwma,
                    avgDurationMsEwma = avgDurationEwma,
                    constrainedHits = 0,
                    normalHits = if (shouldFlip) 0 else normalHits
                )
            }
        }

        ref.set(next)
    }

    fun mode(partitionKey: String = "global"): Mode = refFor(partitionKey).get().mode

    fun snapshot(partitionKey: String = "global"): Snapshot {
        val state = refFor(partitionKey).get()
        return Snapshot(
            mode = state.mode,
            failRate = state.failRateEwma,
            avgDurationMs = state.avgDurationMsEwma,
            constrainedHits = state.constrainedHits,
            normalHits = state.normalHits
        )
    }

    fun adjustCount(base: Int, min: Int = 4, partitionKey: String = "global"): Int {
        if (base <= 0) return 0
        return if (mode(partitionKey) == Mode.CONSTRAINED) {
            maxOf(min, (base * 0.6f).toInt())
        } else {
            base
        }
    }

    private fun refFor(partitionKey: String): AtomicReference<State> {
        if (partitionKey == "global") return stateRef
        val normalized = partitionKey.trim().lowercase().ifBlank { "global" }
        if (normalized == "global") return stateRef
        return stateByPartition.getOrPut(normalized) {
            AtomicReference(
                State(
                    mode = Mode.NORMAL,
                    failRateEwma = 0f,
                    avgDurationMsEwma = 0L,
                    constrainedHits = 0,
                    normalHits = 0
                )
            )
        }
    }

    private fun ewma(previous: Float, current: Float): Float {
        return (EWMA_ALPHA * current) + ((1f - EWMA_ALPHA) * previous)
    }
}
