package com.smartifly.tv.performance

import android.content.Context
import coil.ImageLoader
import coil.request.ImageRequest

class ImagePreloader(private val context: Context) {
    private val imageLoader = ImageLoader(context)

    fun preload(url: String) {
        if (url.isEmpty()) return
        val request = ImageRequest.Builder(context)
            .data(url)
            .build()
        imageLoader.enqueue(request)
    }

    fun preloadBatch(urls: List<String>) {
        urls.forEach { preload(it) }
    }
}
