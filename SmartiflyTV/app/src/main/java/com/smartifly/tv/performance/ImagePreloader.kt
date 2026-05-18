package com.smartifly.tv.performance

import android.content.Context
import coil.imageLoader
import coil.request.SuccessResult
import coil.request.ImageRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ImagePreloader(private val context: Context) {
    // Use the app-wide singleton loader so prefetch and UI share the same caches.
    private val imageLoader = context.imageLoader

    fun preload(url: String) {
        if (url.isEmpty()) return
        val request = ImageRequest.Builder(context)
            .data(url)
            .build()
        imageLoader.enqueue(request)
    }

    fun preloadBatch(urls: List<String>) {
        val effective = if (PreloadBackpressure.mode() == PreloadBackpressure.Mode.CONSTRAINED) {
            urls.take(24)
        } else {
            urls
        }
        effective.forEach { preload(it) }
    }

    suspend fun preloadBatchInOrder(urls: List<String>) {
        if (urls.isEmpty()) return
        withContext(Dispatchers.IO) {
            urls.filter { it.isNotBlank() }.forEach { url ->
                val request = ImageRequest.Builder(context)
                    .data(url)
                    .build()
                runCatching { imageLoader.execute(request) }
            }
        }
    }

    suspend fun preloadBatchInOrderWithTelemetry(tag: String, urls: List<String>) {
        if (urls.isEmpty()) return
        var memoryHits = 0
        var diskHits = 0
        var networkHits = 0
        var otherHits = 0
        var failures = 0
        val start = System.currentTimeMillis()

        withContext(Dispatchers.IO) {
            urls.filter { it.isNotBlank() }.forEach { url ->
                val request = ImageRequest.Builder(context)
                    .data(url)
                    .build()
                val result = runCatching { imageLoader.execute(request) }.getOrNull()
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
            total = urls.size,
            failures = failures,
            durationMs = durationMs
        )
        PerformanceKpiMonitor.recordPrefetchBatch(
            tag = tag,
            totalUrls = urls.size,
            failures = failures,
            durationMs = durationMs
        )
        android.util.Log.d(
            "SmartiflyImage",
            "image_pipeline_debug tag=$tag urls=${urls.size} mem=$memoryHits disk=$diskHits net=$networkHits other=$otherHits fail=$failures duration_ms=$durationMs"
        )
    }
}
