package com.smartifly.tv.performance

import android.content.Context
import coil.imageLoader
import coil.request.SuccessResult
import coil.request.ImageRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import java.net.URI

class ImagePreloader(private val context: Context) {
    companion object {
        private const val PREFETCH_EXECUTE_TIMEOUT_MS = 1200L
        // Shared process-wide gate to prevent multi-screen prefetch contention spikes.
        private val orderedPrefetchGate = Semaphore(2)
    }

    // Use the app-wide singleton loader so prefetch and UI share the same caches.
    private val imageLoader = context.imageLoader
    private val prefetchWidthPx = 360
    private val prefetchHeightPx = 540

    private fun buildPrefetchRequest(url: String): ImageRequest {
        return ImageRequest.Builder(context)
            .data(url)
            .size(prefetchWidthPx, prefetchHeightPx)
            .build()
    }

    fun preload(url: String) {
        if (url.isEmpty()) return
        val request = buildPrefetchRequest(url)
        imageLoader.enqueue(request)
    }

    fun preloadBatch(urls: List<String>) {
        val deduped = urls
            .asSequence()
            .filter { it.isNotBlank() }
            .distinct()
            .toList()
        if (deduped.isEmpty()) return
        val partitionKey = partitionKeyFromUrls(deduped)
        val effective = if (PreloadBackpressure.mode(partitionKey) == PreloadBackpressure.Mode.CONSTRAINED) {
            deduped.take(20)
        } else {
            deduped.take(32)
        }
        effective.forEach { preload(it) }
    }

    suspend fun preloadBatchInOrder(urls: List<String>) {
        if (urls.isEmpty()) return
        withContext(Dispatchers.IO) {
            urls.filter { it.isNotBlank() }.forEach { url ->
                val request = buildPrefetchRequest(url)
                orderedPrefetchGate.withPermit {
                    withTimeoutOrNull(PREFETCH_EXECUTE_TIMEOUT_MS) {
                        runCatching { imageLoader.execute(request) }
                    }
                }
            }
        }
    }

    suspend fun preloadBatchInOrderWithTelemetry(tag: String, urls: List<String>) {
        if (urls.isEmpty()) return
        val effectiveUrls = urls.filter { it.isNotBlank() }
        if (effectiveUrls.isEmpty()) return
        val partitionKey = partitionKeyFromUrls(effectiveUrls)
        var memoryHits = 0
        var diskHits = 0
        var networkHits = 0
        var otherHits = 0
        var failures = 0
        val start = System.currentTimeMillis()

        withContext(Dispatchers.IO) {
            effectiveUrls.forEach { url ->
                val request = buildPrefetchRequest(url)
                val result = orderedPrefetchGate.withPermit {
                    withTimeoutOrNull(PREFETCH_EXECUTE_TIMEOUT_MS) {
                        runCatching { imageLoader.execute(request) }.getOrNull()
                    }
                }
                if (result is SuccessResult) {
                    val source = result.dataSource.name.uppercase()
                    when {
                        source.contains("MEMORY") -> memoryHits++
                        source.contains("DISK") -> diskHits++
                        source.contains("NETWORK") -> networkHits++
                        else -> otherHits++
                    }
                } else {
                    failures++
                }
            }
        }

        val durationMs = System.currentTimeMillis() - start
        PreloadBackpressure.onBatchTelemetry(
            total = effectiveUrls.size,
            failures = failures,
            durationMs = durationMs,
            partitionKey = partitionKey
        )
        PerformanceKpiMonitor.recordPrefetchBatch(
            tag = tag,
            totalUrls = effectiveUrls.size,
            failures = failures,
            durationMs = durationMs
        )
        android.util.Log.d(
            "SmartiflyImage",
            "image_pipeline_debug tag=$tag partition=$partitionKey urls=${effectiveUrls.size} mem=$memoryHits disk=$diskHits net=$networkHits other=$otherHits fail=$failures duration_ms=$durationMs"
        )
    }

    private fun partitionKeyFromUrls(urls: List<String>): String {
        val host = urls.asSequence()
            .mapNotNull { url ->
                runCatching { URI(url).host?.lowercase() }.getOrNull()
            }
            .firstOrNull { !it.isNullOrBlank() }
        return host ?: "global"
    }
}
