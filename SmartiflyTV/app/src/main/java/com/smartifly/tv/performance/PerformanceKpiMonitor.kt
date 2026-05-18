package com.smartifly.tv.performance

import java.util.ArrayList
import kotlin.math.ceil

object PerformanceKpiMonitor {
    private const val MAX_IMAGE_SAMPLES = 400
    private const val MAX_PREFETCH_SAMPLES = 200

    data class ImageSample(
        val context: String,
        val durationMs: Long,
        val success: Boolean
    )

    data class PrefetchSample(
        val tag: String,
        val totalUrls: Int,
        val failures: Int,
        val durationMs: Long
    )

    data class Snapshot(
        val imageSamples: Int,
        val imageSuccessRatePct: Int,
        val imageP50Ms: Long,
        val imageP95Ms: Long,
        val prefetchSamples: Int,
        val prefetchAvgBatchMs: Long,
        val prefetchAvgFailRatePct: Int,
        val preloadMode: String
    )

    private val imageSamples = ArrayList<ImageSample>()
    private val prefetchSamples = ArrayList<PrefetchSample>()

    @Synchronized
    fun recordImageLoad(context: String, durationMs: Long, success: Boolean) {
        imageSamples.add(
            ImageSample(
                context = context,
                durationMs = durationMs.coerceAtLeast(1L),
                success = success
            )
        )
        trim(imageSamples, MAX_IMAGE_SAMPLES)
    }

    @Synchronized
    fun recordPrefetchBatch(tag: String, totalUrls: Int, failures: Int, durationMs: Long) {
        prefetchSamples.add(
            PrefetchSample(
                tag = tag,
                totalUrls = totalUrls.coerceAtLeast(0),
                failures = failures.coerceAtLeast(0),
                durationMs = durationMs.coerceAtLeast(1L)
            )
        )
        trim(prefetchSamples, MAX_PREFETCH_SAMPLES)
    }

    @Synchronized
    fun snapshot(): Snapshot {
        val imageCopy = imageSamples.toList()
        val prefetchCopy = prefetchSamples.toList()

        val imageDurations = imageCopy.map { it.durationMs }.sorted()
        val successCount = imageCopy.count { it.success }
        val successRate = if (imageCopy.isEmpty()) 0 else (successCount * 100 / imageCopy.size)
        val p50 = percentile(imageDurations, 0.50)
        val p95 = percentile(imageDurations, 0.95)

        val avgBatchMs = if (prefetchCopy.isEmpty()) 0L else prefetchCopy.map { it.durationMs }.average().toLong()
        val avgFailRatePct = if (prefetchCopy.isEmpty()) 0 else {
            val rates = prefetchCopy.map { sample ->
                if (sample.totalUrls <= 0) 0.0 else (sample.failures.toDouble() / sample.totalUrls.toDouble()) * 100.0
            }
            rates.average().toInt()
        }

        return Snapshot(
            imageSamples = imageCopy.size,
            imageSuccessRatePct = successRate,
            imageP50Ms = p50,
            imageP95Ms = p95,
            prefetchSamples = prefetchCopy.size,
            prefetchAvgBatchMs = avgBatchMs,
            prefetchAvgFailRatePct = avgFailRatePct,
            preloadMode = PreloadBackpressure.snapshot().mode.name
        )
    }

    private fun percentile(sortedValues: List<Long>, p: Double): Long {
        if (sortedValues.isEmpty()) return 0L
        val index = ceil((sortedValues.size * p)).toInt().coerceIn(1, sortedValues.size) - 1
        return sortedValues[index]
    }

    private fun <T> trim(list: ArrayList<T>, maxSize: Int) {
        if (list.size <= maxSize) return
        val removeCount = list.size - maxSize
        repeat(removeCount) { list.removeAt(0) }
    }
}
