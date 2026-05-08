package com.smartifly.tv.player

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.ResumeWatchingRepository
import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.remote.dto.StreamDto
import com.smartifly.tv.data.repository.StreamRepository
import com.smartifly.tv.ui.theme.SmartiflyTheme
import kotlinx.coroutines.delay
import java.util.Locale

@OptIn(UnstableApi::class)
@ExperimentalTvMaterial3Api
@Composable
fun PlayerScreen(
    contentId: String,
    contentType: String,
    profileId: String,
    isInPipMode: Boolean = false,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val resumeRepository = remember { ResumeWatchingRepository(context) }
    val streamRepository = remember { StreamRepository(ApiClient.api) }
    
    var streamInfo by remember { mutableStateOf<StreamDto?>(null) }
    var resolveError by remember { mutableStateOf<String?>(null) }
    var isResolving by remember { mutableStateOf(true) }

    LaunchedEffect(contentId) {
        isResolving = true
        try {
            streamInfo = streamRepository.resolveStream(contentId, contentType)
        } catch (e: Exception) {
            resolveError = NetworkErrorMapper.toUserMessage(e)
        } finally {
            isResolving = false
        }
    }

    if (isResolving) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (resolveError != null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(text = "Error: $resolveError", color = Color.Red)
        }
        return
    }

    streamInfo?.let { info ->
        val exoPlayer = rememberExoPlayer(info)
        val trackSelectionManager = remember(exoPlayer) { TrackSelectionManager(exoPlayer) }
        
        var isPlaying by remember { mutableStateOf(true) }
        var showControls by remember { mutableStateOf(true) }
        var showSettings by remember { mutableStateOf(false) }
        var playbackProgress by remember { mutableStateOf(0f) }
        var currentTime by remember { mutableLongStateOf(0L) }
        var duration by remember { mutableLongStateOf(0L) }
        var isLoading by remember { mutableStateOf(true) }

        var hasSkippedIntro by remember { mutableStateOf(false) }
        val introStart = info.introStart ?: -1L
        val introEnd = info.introEnd ?: -1L
        var showSkipIntro by remember { mutableStateOf(false) }

        val savedProgress by resumeRepository.getWatchProgress(profileId, info.id).collectAsState(initial = null)
        var resumeCheckDone by remember { mutableStateOf(false) }

        DisposableEffect(exoPlayer) {
            val listener = object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying) {
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_play", mapOf("content_id" to info.id, "title" to info.title))
                    } else if (exoPlayer.playbackState != Player.STATE_ENDED && exoPlayer.playbackState != Player.STATE_IDLE) {
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_pause", mapOf("content_id" to info.id, "position" to exoPlayer.currentPosition.toString()))
                    }
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    when (playbackState) {
                        Player.STATE_READY -> {
                            com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_ready", mapOf("content_id" to info.id))
                        }
                        Player.STATE_ENDED -> {
                            com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_complete", mapOf("content_id" to info.id))
                        }
                        else -> {}
                    }
                }

                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    com.smartifly.tv.analytics.TelemetryManager.logError("Playback Error: ${error.message}", error)
                    com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_error", mapOf("content_id" to info.id, "error" to (error.message ?: "unknown")))
                }
            }
            exoPlayer.addListener(listener)
            onDispose { exoPlayer.removeListener(listener) }
        }

        LaunchedEffect(savedProgress) {
            if (savedProgress != null && !resumeCheckDone) {
                exoPlayer.seekTo(savedProgress!!.positionMs)
                resumeCheckDone = true
            }
        }

        LaunchedEffect(exoPlayer) {
            while (true) {
                val pos = exoPlayer.currentPosition
                val dur = exoPlayer.duration
                if (dur > 0) {
                    playbackProgress = pos.toFloat() / dur.toFloat()
                    currentTime = pos
                    duration = dur
                    
                    if (pos > 1000) {
                        resumeRepository.saveProgress(
                            profileId = profileId,
                            progress = WatchProgress(
                                contentId = info.id,
                                positionMs = pos,
                                durationMs = dur,
                                lastUpdated = System.currentTimeMillis(),
                                metadata = info.toDomain()
                            )
                        )
                        // Also update Android TV Launcher "Watch Next"
                        com.smartifly.tv.tvlauncher.ChannelManager(context).updateWatchNext(
                            movie = info.toDomain(),
                            positionMs = pos,
                            durationMs = dur
                        )
                    }
                }
                isPlaying = exoPlayer.isPlaying
                isLoading = exoPlayer.playbackState == Player.STATE_BUFFERING
                showSkipIntro = introStart != -1L && pos in introStart..introEnd && !hasSkippedIntro
                delay(10000)
            }
        }

        SmartiflyTheme {
            Box(modifier = Modifier.fillMaxSize().focusable()) {
                AndroidView(
                    factory = {
                        PlayerView(context).apply {
                            player = exoPlayer
                            useController = false
                            layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                if (isLoading) CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))

                if (!isInPipMode) {
                    PlayerControls(
                        isVisible = showControls && !showSettings,
                        title = info.title,
                        isPlaying = isPlaying,
                        onPlayPause = { if (isPlaying) exoPlayer.pause() else exoPlayer.play(); isPlaying = !isPlaying },
                        onSeekForward = { exoPlayer.seekTo(exoPlayer.currentPosition + 10000) },
                        onSeekBackward = { exoPlayer.seekTo(exoPlayer.currentPosition - 10000) },
                        onBack = onBack,
                        onSettingsClick = { showSettings = true },
                        progress = playbackProgress,
                        currentTime = formatTime(currentTime),
                        duration = formatTime(duration)
                    )
                    
                    PlayerSettingsOverlay(isVisible = showSettings, onClose = { showSettings = false }, trackSelectionManager = trackSelectionManager)
                    SkipIntroOverlay(isVisible = showSkipIntro, onSkip = { exoPlayer.seekTo(introEnd); hasSkippedIntro = true })
                }
            }
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
}
