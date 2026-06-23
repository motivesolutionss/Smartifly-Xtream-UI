package com.smartifly.tv.ui.components.base

import android.annotation.SuppressLint
import android.util.Log
import android.webkit.WebView
import android.webkit.WebChromeClient
import android.webkit.WebViewClient
import android.webkit.ConsoleMessage
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

private const val TRAILER_TAG = "SmartiflyTrailer"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun PreviewPlayer(
    videoUrl: String,
    modifier: Modifier = Modifier,
    onYoutubePlayerError: ((Int) -> Unit)? = null
) {
    val youtubeId = remember(videoUrl) { extractYoutubeVideoId(videoUrl) }
    val embedUrl = remember(videoUrl) { buildPlayablePreviewUrl(videoUrl) }
    val embedHtml = remember(youtubeId) { youtubeId?.let(::buildYoutubeEmbedHtml) }
    var lastReportedErrorCode by rememberSaveable(videoUrl) { mutableStateOf<Int?>(null) }

    LaunchedEffect(videoUrl, youtubeId, embedUrl) {
        Log.d(
            TRAILER_TAG,
            "preview_init raw=$videoUrl youtubeId=$youtubeId embedUrl=$embedUrl html=${embedHtml != null}"
        )
    }

    Box(modifier = modifier.fillMaxSize()) {
        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            Log.d(TRAILER_TAG, "page_finished url=$url")
                        }

                        @Deprecated("Deprecated in Java")
                        override fun onReceivedError(
                            view: WebView?,
                            errorCode: Int,
                            description: String?,
                            failingUrl: String?
                        ) {
                            super.onReceivedError(view, errorCode, description, failingUrl)
                            Log.e(
                                TRAILER_TAG,
                                "received_error code=$errorCode description=$description url=$failingUrl"
                            )
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                            extractYoutubePlayerErrorCode(consoleMessage.message())?.let { code ->
                                if (lastReportedErrorCode != code) {
                                    lastReportedErrorCode = code
                                    onYoutubePlayerError?.invoke(code)
                                }
                            }
                            Log.d(
                                TRAILER_TAG,
                                "console ${consoleMessage.messageLevel()} ${consoleMessage.message()} @${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}"
                            )
                            return super.onConsoleMessage(consoleMessage)
                        }
                    }
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.databaseEnabled = true
                    settings.loadsImagesAutomatically = true
                    settings.useWideViewPort = true
                    settings.loadWithOverviewMode = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.javaScriptCanOpenWindowsAutomatically = true
                    settings.setSupportMultipleWindows(false)
                    settings.userAgentString =
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36"
                    settings.allowContentAccess = true
                    settings.allowFileAccess = false
                    setBackgroundColor(android.graphics.Color.BLACK)
                    if (embedHtml != null) {
                        Log.d(TRAILER_TAG, "load_html youtubeId=$youtubeId")
                        loadDataWithBaseURL(
                            "https://www.youtube.com",
                            embedHtml,
                            "text/html",
                            "utf-8",
                            null
                        )
                    } else {
                        Log.d(TRAILER_TAG, "load_url url=$embedUrl")
                        loadUrl(embedUrl)
                    }
                }
            },
            update = { webView ->
                if (embedHtml != null) {
                    Log.d(TRAILER_TAG, "update_load_html youtubeId=$youtubeId")
                    webView.loadDataWithBaseURL(
                        "https://www.youtube.com",
                        embedHtml,
                        "text/html",
                        "utf-8",
                        null
                    )
                } else {
                    Log.d(TRAILER_TAG, "update_load_url url=$embedUrl")
                    webView.loadUrl(embedUrl)
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

private fun buildPlayablePreviewUrl(videoUrl: String): String {
    val youtubeId = extractYoutubeVideoId(videoUrl)
    return if (youtubeId != null) {
        "https://www.youtube-nocookie.com/embed/$youtubeId?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1"
    } else {
        videoUrl
    }
}

private fun buildYoutubeEmbedHtml(videoId: String): String = """
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #000000;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          #player {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="player"></div>
        <script>
          var tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api";
          var firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

          var player;
          function onYouTubeIframeAPIReady() {
            console.log('YT_IFRAME_API_READY videoId=$videoId');
            player = new YT.Player('player', {
              width: '100%',
              height: '100%',
              videoId: '$videoId',
              playerVars: {
                autoplay: 1,
                rel: 0,
                playsinline: 1,
                modestbranding: 1,
                controls: 1,
                fs: 0
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          }

          function onPlayerReady(event) {
            console.log('YT_PLAYER_READY');
            try {
              event.target.playVideo();
            } catch (e) {}
          }

          function onPlayerStateChange(event) {
            console.log('YT_PLAYER_STATE:' + event.data);
          }

          function onPlayerError(event) {
            console.log('YT_PLAYER_ERROR:' + event.data);
          }
        </script>
      </body>
    </html>
""".trimIndent()

private fun extractYoutubeVideoId(value: String): String? {
    val trimmed = value.trim()
    if (trimmed.isBlank()) return null
    val regex = Regex("^.*(?:youtu\\.be/|v/|u/\\w/|embed/|watch\\?v=|&v=)([^#&?]{11}).*$")
    val match = regex.matchEntire(trimmed)
    if (match != null) {
        return match.groupValues.getOrNull(1)?.takeIf { it.length == 11 }
    }
    return trimmed.takeIf { it.length == 11 && it.matches(Regex("[A-Za-z0-9_-]{11}")) }
}

private fun extractYoutubePlayerErrorCode(message: String?): Int? {
    if (message.isNullOrBlank()) return null
    val prefix = "YT_PLAYER_ERROR:"
    if (!message.startsWith(prefix)) return null
    return message.removePrefix(prefix).trim().toIntOrNull()
}
