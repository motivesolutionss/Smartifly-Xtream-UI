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
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.media3.common.PlaybackException
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
import com.smartifly.tv.data.repository.AnalyticsRepository
import com.smartifly.tv.player.pip.PipManager
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.components.player.AutoPlayOverlay
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@OptIn(UnstableApi::class)
@ExperimentalTvMaterial3Api
@Composable
fun PlayerScreen(
    movie: com.smartifly.tv.data.models.MovieMetadata,
    profileId: String,
    isInPipMode: Boolean = false,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val resumeRepository = remember { ResumeWatchingRepository(context, ApiClient.api) }
    val streamRepository = remember { StreamRepository(ApiClient.sessionManager) }
    val analyticsRepository = remember { AnalyticsRepository(ApiClient.api) }
    val scope = rememberCoroutineScope()
    
    var streamInfo by remember { mutableStateOf<StreamDto?>(null) }
    var resolveError by remember { mutableStateOf<String?>(null) }
    var isResolving by remember { mutableStateOf(true) }

    LaunchedEffect(movie.id) {
        isResolving = true
        try {
            streamInfo = streamRepository.resolveStream(movie.id, movie.type)
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
        DisposableEffect(Unit) {
            PipManager.setPlaybackActive(true)
            onDispose { PipManager.setPlaybackActive(false) }
        }

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
        
        var showAutoPlay by remember { mutableStateOf(false) }
        var autoPlayCountdown by remember { mutableIntStateOf(10) }
        val nextEpisode: com.smartifly.tv.data.remote.dto.StreamDto? = null // Simulated field, nulling out to fix build

        val savedProgress by resumeRepository.getWatchProgress(profileId, info.id).collectAsState(initial = null)
        var resumeCheckDone by remember { mutableStateOf(false) }

        DisposableEffect(exoPlayer) {
            val listener = object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying) {
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_play", mapOf("content_id" to info.id, "title" to info.title))
                        scope.launch { analyticsRepository.trackPlayback(movie.id, movie.type, profileId, "start") }
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
                            scope.launch { analyticsRepository.trackPlayback(movie.id, movie.type, profileId, "complete") }
                        }
                        else -> {}
                    }
                }

                override fun onPlayerError(error: PlaybackException) {
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
                                contentId = movie.id,
                                positionMs = pos,
                                durationMs = dur,
                                lastUpdated = System.currentTimeMillis(),
                                metadata = movie
                            )
                        )
                        // Also update Android TV Launcher "Watch Next"
                        com.smartifly.tv.tvlauncher.ChannelManager(context).updateWatchNext(
                            movie = movie,
                            positionMs = pos,
                            durationMs = dur
                        )
                    }
                }
                isPlaying = exoPlayer.isPlaying
                isLoading = exoPlayer.playbackState == Player.STATE_BUFFERING
                showSkipIntro = introStart != -1L && pos in introStart..introEnd && !hasSkippedIntro
                
                // Auto-Play Logic: 10s before end
                if (dur > 0 && dur - pos < 10000 && !showAutoPlay && nextEpisode != null) {
                    showAutoPlay = true
                }
                
                if (showAutoPlay) {
                    autoPlayCountdown = ((dur - pos) / 1000).toInt().coerceIn(0, 10)
                    if (dur - pos < 500) {
                        // Trigger actual next play logic here
                    }
                }
                
                delay(1000) // Changed to 1s for smoother countdown
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
                    val isLive = movie.type == "live"
                    PlayerControls(
                        isVisible = showControls && !showSettings,
                        title = movie.title,
                        isPlaying = isPlaying,
                        onPlayPause = { if (isPlaying) exoPlayer.pause() else exoPlayer.play(); isPlaying = !isPlaying },
                        onSeekForward = if (isLive) null else ({ exoPlayer.seekTo(exoPlayer.currentPosition + 10000) }),
                        onSeekBackward = if (isLive) null else ({ exoPlayer.seekTo(exoPlayer.currentPosition - 10000) }),
                        onBack = onBack,
                        onSettingsClick = { showSettings = true },
                        progress = if (isLive) 0f else playbackProgress,
                        currentTime = if (isLive) "LIVE" else formatTime(currentTime),
                        duration = if (isLive) "" else formatTime(duration)
                    )
                    
                    if (!isLive) {
                        PlayerSettingsOverlay(isVisible = showSettings, onClose = { showSettings = false }, trackSelectionManager = trackSelectionManager)
                        SkipIntroOverlay(isVisible = showSkipIntro, onSkip = { exoPlayer.seekTo(introEnd); hasSkippedIntro = true })
                        
                        if (showAutoPlay && nextEpisode != null) {
                            AutoPlayOverlay(
                                nextEpisodeTitle = nextEpisode.title,
                                nextEpisodePoster = nextEpisode.backdropUrl,
                                countdownSeconds = autoPlayCountdown,
                                onPlayNow = { /* Logic to navigate to next player */ },
                                onCancel = { showAutoPlay = false }
                            )
                        }
                    }
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
