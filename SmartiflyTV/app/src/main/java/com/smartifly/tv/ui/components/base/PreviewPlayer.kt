package com.smartifly.tv.ui.components.base

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun PreviewPlayer(
    videoUrl: String,
    modifier: Modifier = Modifier
) {
    // If it's a YouTube URL, we use a WebView-based embed for simplicity in this demo
    // In a production app, you'd use a native YouTube SDK
    val embedUrl = if (videoUrl.contains("youtube.com/watch?v=")) {
        val videoId = videoUrl.substringAfter("v=")
        "https://www.youtube.com/embed/$videoId?autoplay=1&mute=1&controls=0&loop=1&playlist=$videoId"
    } else videoUrl

    Box(modifier = modifier.fillMaxSize()) {
        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    webViewClient = WebViewClient()
                    settings.javaScriptEnabled = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    loadUrl(embedUrl)
                }
            },
            modifier = Modifier.fillMaxSize(),
            onRelease = { webView ->
                webView.stopLoading()
                webView.loadUrl("about:blank")
                webView.destroy()
            }
        )
    }
}
