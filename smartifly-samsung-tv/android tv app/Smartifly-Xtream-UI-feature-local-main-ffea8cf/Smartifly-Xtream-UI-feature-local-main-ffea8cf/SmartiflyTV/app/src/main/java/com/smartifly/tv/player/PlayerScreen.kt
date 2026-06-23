package com.smartifly.tv.player

import android.os.SystemClock
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.compose.foundation.focusable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.PlaybackException
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.OutlinedButton
import androidx.tv.material3.Text
import com.smartifly.tv.data.ResumeWatchingRepository
import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.PlaybackRequest
import com.smartifly.tv.data.models.asMovieMetadata
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.dto.StreamDto
import com.smartifly.tv.data.repository.StreamRepository
import com.smartifly.tv.data.repository.AnalyticsRepository
import com.smartifly.tv.data.repository.XtreamRepository
import com.smartifly.tv.data.repository.StreamRepository.StreamResolutionException
import com.smartifly.tv.player.pip.PipManager
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.components.player.AutoPlayOverlay
import com.smartifly.tv.ui.components.base.SmartiflyLoader
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale
import androidx.activity.compose.BackHandler
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.focus.focusProperties
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.ui.graphics.vector.ImageVector
import com.smartifly.tv.ui.theme.SmartiflyIcons

enum class HudIcon {
    Play, Pause, SeekForward, SeekBackward
}

@OptIn(UnstableApi::class)
@ExperimentalTvMaterial3Api
@Composable
fun PlayerScreen(
    playbackRequest: PlaybackRequest,
    profileId: String,
    repository: XtreamRepository,
    isInPipMode: Boolean = false,
    onPlaybackRequestChange: (PlaybackRequest) -> Unit = {},
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val resumeRepository = remember { ResumeWatchingRepository(context, ApiClient.api) }
    val streamRepository = remember { StreamRepository(ApiClient.sessionManager) }
    val analyticsRepository = remember { AnalyticsRepository(ApiClient.api, ApiClient.sessionManager) }
    val scope = rememberCoroutineScope()
    
    var streamInfo by remember { mutableStateOf<StreamDto?>(null) }
    var resolveError by remember { mutableStateOf<String?>(null) }
    var isResolving by remember { mutableStateOf(true) }
    var playerSessionKey by remember { mutableIntStateOf(0) }
    var playbackError by remember { mutableStateOf<String?>(null) }
    var retryAttempt by remember { mutableIntStateOf(0) }
    var channelList by remember { mutableStateOf<List<LiveStream>>(emptyList()) }
    val playbackMetadata = remember(playbackRequest) { playbackRequest.asMovieMetadata() }
    val isLivePlayback = playbackRequest.type == "live"
    var sessionStartedAtMs by remember(playbackRequest.id, playbackRequest.type) { mutableLongStateOf(SystemClock.elapsedRealtime()) }
    var resolveCompletedAtMs by remember(playbackRequest.id, playbackRequest.type) { mutableLongStateOf(0L) }
    val playbackLogId = remember(playbackRequest.id, playbackRequest.type) { "${playbackRequest.type}:${playbackRequest.id}" }

    LaunchedEffect(playbackRequest) {
        sessionStartedAtMs = SystemClock.elapsedRealtime()
        resolveCompletedAtMs = 0L
        isResolving = true
        resolveError = null
        playbackError = null
        retryAttempt = 0
        streamInfo = null
        Log.i(
            "SmartiflyPlayerPerf",
            "player_open_start id=$playbackLogId title=${playbackRequest.title} is_live=$isLivePlayback"
        )
        try {
            val resolved = streamRepository.resolveStream(playbackRequest)
            if (resolved.url.isBlank()) {
                throw StreamResolutionException("Unable to resolve playback URL for this content.")
            }
            streamInfo = resolved
            resolveCompletedAtMs = SystemClock.elapsedRealtime()
            val resolvedHost = runCatching { java.net.URI(resolved.url).host ?: "unknown" }.getOrDefault("unknown")
            Log.i(
                "SmartiflyPlayerPerf",
                "player_resolve_success id=$playbackLogId duration_ms=${resolveCompletedAtMs - sessionStartedAtMs} url_host=$resolvedHost"
            )
            playerSessionKey += 1
        } catch (e: Exception) {
            resolveError = e.message?.takeIf { it.isNotBlank() } ?: NetworkErrorMapper.toUserMessage(e)
            Log.w(
                "SmartiflyPlayerPerf",
                "player_resolve_error id=$playbackLogId duration_ms=${SystemClock.elapsedRealtime() - sessionStartedAtMs} error=${resolveError ?: "unknown"}"
            )
        } finally {
            isResolving = false
        }
    }

    LaunchedEffect(playbackRequest, repository) {
        if (playbackRequest !is PlaybackRequest.Live) {
            channelList = emptyList()
            return@LaunchedEffect
        }
        repository.getLiveStreamsCached(playbackRequest.channel.categoryId).collect { result ->
            if (result is NetworkResult.Success) {
                channelList = result.data
            }
        }
    }

    if (isResolving) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            SmartiflyLoader()
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

        val exoPlayer = rememberExoPlayer(
            streamInfo = info,
            isLive = isLivePlayback,
            playerSessionKey = playerSessionKey
        )
        val trackSelectionManager = remember(exoPlayer) { TrackSelectionManager(exoPlayer) }
        
        var isPlaying by remember { mutableStateOf(true) }
        var showControls by remember { mutableStateOf(true) }
        var lastInteractionAtMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
        var centerHudIcon by remember { mutableStateOf<HudIcon?>(null) }
        var hudTriggerCount by remember { mutableIntStateOf(0) }
        var isScrubbing by remember { mutableStateOf(false) }
        var scrubTargetMs by remember { mutableLongStateOf(0L) }
        var showSettings by remember { mutableStateOf(false) }
        var playbackProgress by remember { mutableStateOf(0f) }
        var currentTime by remember { mutableLongStateOf(0L) }
        var duration by remember { mutableLongStateOf(0L) }
        var isLoading by remember { mutableStateOf(true) }
        var bufferingStartedAtMs by remember(playerSessionKey) { mutableLongStateOf(0L) }
        var totalBufferingMs by remember(playerSessionKey) { mutableLongStateOf(0L) }
        var bufferingCount by remember(playerSessionKey) { mutableIntStateOf(0) }
        var readyLogged by remember(playerSessionKey) { mutableStateOf(false) }
        var firstFrameLogged by remember(playerSessionKey) { mutableStateOf(false) }
        var firstFrameAtMs by remember(playerSessionKey) { mutableLongStateOf(0L) }

        var hasSkippedIntro by remember { mutableStateOf(false) }
        val introStart = info.introStart ?: -1L
        val introEnd = info.introEnd ?: -1L
        var showSkipIntro by remember { mutableStateOf(false) }
        
        var showAutoPlay by remember { mutableStateOf(false) }
        var autoPlayCountdown by remember { mutableIntStateOf(10) }
        val nextEpisode: com.smartifly.tv.data.remote.dto.StreamDto? = null // Simulated field, nulling out to fix build
        var isLiveFavorite by remember(playbackRequest.id, playbackRequest.type) { mutableStateOf(false) }
        val currentLiveIndex by remember(playbackRequest, channelList) {
            derivedStateOf {
                val currentId = (playbackRequest as? PlaybackRequest.Live)?.channel?.id ?: return@derivedStateOf -1
                channelList.indexOfFirst { it.id == currentId }
            }
        }

        val savedProgress by resumeRepository.getWatchProgress(profileId, info.id).collectAsState(initial = null)
        var resumeCheckDone by remember { mutableStateOf(false) }

        LaunchedEffect(playbackRequest.id, playbackRequest.type) {
            if (playbackRequest.type != "live") return@LaunchedEffect
            isLiveFavorite = runCatching { repository.isLiveFavorite(playbackRequest.id) }.getOrDefault(false)
        }

        DisposableEffect(exoPlayer) {
            val listener = object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    if (isPlaying) {
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_play", mapOf("content_id" to info.id, "title" to info.title))
                        scope.launch { analyticsRepository.trackPlayback(playbackRequest.id, playbackRequest.type, profileId, "start") }
                    } else if (exoPlayer.playbackState != Player.STATE_ENDED && exoPlayer.playbackState != Player.STATE_IDLE) {
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_pause", mapOf("content_id" to info.id, "position" to exoPlayer.currentPosition.toString()))
                    }
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    when (playbackState) {
                        Player.STATE_BUFFERING -> {
                            if (bufferingStartedAtMs == 0L) {
                                bufferingStartedAtMs = SystemClock.elapsedRealtime()
                                bufferingCount += 1
                                Log.d(
                                    "SmartiflyPlayerPerf",
                                    "player_buffering_start id=$playbackLogId attempt=$retryAttempt count=$bufferingCount position_ms=${exoPlayer.currentPosition}"
                                )
                            }
                        }
                        Player.STATE_READY -> {
                            if (bufferingStartedAtMs != 0L) {
                                totalBufferingMs += (SystemClock.elapsedRealtime() - bufferingStartedAtMs)
                                bufferingStartedAtMs = 0L
                            }
                            if (!readyLogged) {
                                readyLogged = true
                                val now = SystemClock.elapsedRealtime()
                                Log.i(
                                    "SmartiflyPlayerPerf",
                                    "player_ready id=$playbackLogId open_to_ready_ms=${now - sessionStartedAtMs} resolve_to_ready_ms=${if (resolveCompletedAtMs > 0L) now - resolveCompletedAtMs else -1} buffering_count=$bufferingCount total_buffering_ms=$totalBufferingMs is_live=$isLivePlayback"
                                )
                            }
                            com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_ready", mapOf("content_id" to info.id))
                        }
                        Player.STATE_ENDED -> {
                            Log.i(
                                "SmartiflyPlayerPerf",
                                "player_ended id=$playbackLogId played_position_ms=${exoPlayer.currentPosition} total_buffering_ms=$totalBufferingMs buffering_count=$bufferingCount"
                            )
                            com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_complete", mapOf("content_id" to info.id))
                            scope.launch { analyticsRepository.trackPlayback(playbackRequest.id, playbackRequest.type, profileId, "complete") }
                        }
                        else -> {}
                    }
                }

                override fun onRenderedFirstFrame() {
                    if (!firstFrameLogged) {
                        firstFrameLogged = true
                        firstFrameAtMs = SystemClock.elapsedRealtime()
                        Log.i(
                            "SmartiflyPlayerPerf",
                            "player_first_frame id=$playbackLogId open_to_first_frame_ms=${firstFrameAtMs - sessionStartedAtMs} ready_to_first_frame_ms=${if (readyLogged) firstFrameAtMs - (resolveCompletedAtMs.takeIf { it > 0L } ?: sessionStartedAtMs) else -1} buffering_count=$bufferingCount"
                        )
                    }
                }

                override fun onPlayerError(error: PlaybackException) {
                    Log.e(
                        "SmartiflyPlayerPerf",
                        "player_error id=$playbackLogId open_elapsed_ms=${SystemClock.elapsedRealtime() - sessionStartedAtMs} buffering_count=$bufferingCount total_buffering_ms=$totalBufferingMs error=${error.message ?: "unknown"}",
                        error
                    )
                    com.smartifly.tv.analytics.TelemetryManager.logError("Playback Error: ${error.message}", error)
                    com.smartifly.tv.analytics.TelemetryManager.trackEvent("video_error", mapOf("content_id" to info.id, "error" to (error.message ?: "unknown")))
                    val nextFallback = streamInfo?.fallbackUrls?.firstOrNull()
                    if (!nextFallback.isNullOrBlank()) {
                        val current = streamInfo ?: return
                        streamInfo = current.copy(
                            url = nextFallback,
                            fallbackUrls = current.fallbackUrls.drop(1)
                        )
                        playerSessionKey += 1
                        playbackError = null
                        return
                    }

                    if (isLivePlayback && retryAttempt < 2) {
                        val nextAttempt = retryAttempt + 1
                        retryAttempt = nextAttempt
                        val currentRequest = playbackRequest
                        scope.launch {
                            playbackError = "Retrying live stream..."
                            Log.w(
                                "SmartiflyPlayerPerf",
                                "player_retry_scheduled id=$playbackLogId attempt=$nextAttempt delay_ms=${1000L * nextAttempt}"
                            )
                            delay(1000L * nextAttempt)
                            runCatching { streamRepository.resolveStream(currentRequest) }
                                .fold(
                                    onSuccess = {
                                        if (it.url.isBlank()) {
                                            playbackError = "Unable to resolve playback URL for this content."
                                            Log.w(
                                                "SmartiflyPlayerPerf",
                                                "player_retry_failed id=$playbackLogId attempt=$nextAttempt reason=blank_url"
                                            )
                                        } else {
                                            streamInfo = it
                                            resolveCompletedAtMs = SystemClock.elapsedRealtime()
                                            playerSessionKey += 1
                                            playbackError = null
                                            Log.i(
                                                "SmartiflyPlayerPerf",
                                                "player_retry_success id=$playbackLogId attempt=$nextAttempt resolve_duration_ms=${resolveCompletedAtMs - sessionStartedAtMs}"
                                            )
                                        }
                                    },
                                    onFailure = {
                                        playbackError = it.message?.takeIf { message -> message.isNotBlank() }
                                            ?: (it as? Exception)?.let(NetworkErrorMapper::toUserMessage)
                                            ?: "Playback failed"
                                        Log.w(
                                            "SmartiflyPlayerPerf",
                                            "player_retry_failed id=$playbackLogId attempt=$nextAttempt error=${playbackError ?: "unknown"}"
                                        )
                                    }
                                )
                        }
                    } else {
                        playbackError = error.message ?: "Playback failed"
                    }
                }
            }
            exoPlayer.addListener(listener)
            onDispose {
                if (bufferingStartedAtMs != 0L) {
                    totalBufferingMs += (SystemClock.elapsedRealtime() - bufferingStartedAtMs)
                    bufferingStartedAtMs = 0L
                }
                Log.i(
                    "SmartiflyPlayerPerf",
                    "player_session_end id=$playbackLogId wall_duration_ms=${SystemClock.elapsedRealtime() - sessionStartedAtMs} played_position_ms=${exoPlayer.currentPosition} total_buffering_ms=$totalBufferingMs buffering_count=$bufferingCount first_frame_ms=${if (firstFrameAtMs > 0L) firstFrameAtMs - sessionStartedAtMs else -1}"
                )
                exoPlayer.removeListener(listener)
            }
        }

        BackHandler(enabled = true) {
            when {
                showSettings -> {
                    showSettings = false
                    lastInteractionAtMs = System.currentTimeMillis()
                }
                playbackError != null -> {
                    onBack()
                }
                isScrubbing -> {
                    isScrubbing = false
                    lastInteractionAtMs = System.currentTimeMillis()
                }
                showControls -> {
                    showControls = false
                }
                else -> {
                    onBack()
                }
            }
        }

        LaunchedEffect(showControls, showSettings, isScrubbing, playbackError, lastInteractionAtMs) {
            if (showControls && !showSettings && !isScrubbing && playbackError == null) {
                delay(5000L)
                showControls = false
            }
        }

        LaunchedEffect(hudTriggerCount) {
            if (centerHudIcon != null) {
                delay(800L)
                centerHudIcon = null
            }
        }

        LaunchedEffect(savedProgress) {
            if (savedProgress != null && !resumeCheckDone) {
                exoPlayer.seekTo(savedProgress!!.positionMs)
                resumeCheckDone = true
            }
        }

        LaunchedEffect(exoPlayer, isScrubbing) {
            while (true) {
                val pos = exoPlayer.currentPosition
                val dur = exoPlayer.duration
                if (dur > 0) {
                    if (!isScrubbing) {
                        playbackProgress = pos.toFloat() / dur.toFloat()
                        currentTime = pos
                        duration = dur
                        
                        if (pos > 1000) {
                            resumeRepository.saveProgress(
                                profileId = profileId,
                                progress = WatchProgress(
                                    contentId = playbackRequest.id,
                                    positionMs = pos,
                                    durationMs = dur,
                                    lastUpdated = System.currentTimeMillis(),
                                    metadata = playbackMetadata
                                )
                            )
                            // Also update Android TV Launcher "Watch Next"
                            com.smartifly.tv.tvlauncher.ChannelManager(context).updateWatchNext(
                                movie = playbackMetadata,
                                positionMs = pos,
                                durationMs = dur
                            )
                        }
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
                }
                
                delay(1000)
            }
        }

        SmartiflyTheme {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .focusable()
                    .onPreviewKeyEvent { keyEvent ->
                        if (showControls) {
                            lastInteractionAtMs = System.currentTimeMillis()
                        }
                        if (!showControls && keyEvent.type == KeyEventType.KeyDown) {
                            when (keyEvent.key) {
                                Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                                    if (exoPlayer.isPlaying) {
                                        exoPlayer.pause()
                                        centerHudIcon = HudIcon.Pause
                                        hudTriggerCount++
                                    } else {
                                        exoPlayer.play()
                                        centerHudIcon = HudIcon.Play
                                        hudTriggerCount++
                                    }
                                    showControls = true
                                    lastInteractionAtMs = System.currentTimeMillis()
                                    true
                                }
                                Key.DirectionLeft -> {
                                    if (isLivePlayback) {
                                        if (currentLiveIndex >= 0 && channelList.isNotEmpty()) {
                                            val previousIndex = (currentLiveIndex - 1 + channelList.size) % channelList.size
                                            onPlaybackRequestChange(PlaybackRequest.Live(channelList[previousIndex]))
                                            lastInteractionAtMs = System.currentTimeMillis()
                                        }
                                    } else {
                                        val target = (exoPlayer.currentPosition - 10000L).coerceAtLeast(0L)
                                        exoPlayer.seekTo(target)
                                        centerHudIcon = HudIcon.SeekBackward
                                        hudTriggerCount++
                                        showControls = true
                                        lastInteractionAtMs = System.currentTimeMillis()
                                    }
                                    true
                                }
                                Key.DirectionRight -> {
                                    if (isLivePlayback) {
                                        if (currentLiveIndex >= 0 && channelList.isNotEmpty()) {
                                            val nextIndex = (currentLiveIndex + 1) % channelList.size
                                            onPlaybackRequestChange(PlaybackRequest.Live(channelList[nextIndex]))
                                            lastInteractionAtMs = System.currentTimeMillis()
                                        }
                                    } else {
                                        val target = (exoPlayer.currentPosition + 10000L).coerceAtMost(exoPlayer.duration)
                                        exoPlayer.seekTo(target)
                                        centerHudIcon = HudIcon.SeekForward
                                        hudTriggerCount++
                                        showControls = true
                                        lastInteractionAtMs = System.currentTimeMillis()
                                    }
                                    true
                                }
                                Key.DirectionUp, Key.DirectionDown -> {
                                    showControls = true
                                    lastInteractionAtMs = System.currentTimeMillis()
                                    true
                                }
                                else -> false
                            }
                        } else {
                            false
                        }
                    }
            ) {
                AndroidView(
                    factory = {
                        PlayerView(context).apply {
                            player = exoPlayer
                            useController = false
                            resizeMode = if (isLivePlayback) {
                                AspectRatioFrameLayout.RESIZE_MODE_FIT
                            } else {
                                AspectRatioFrameLayout.RESIZE_MODE_FIT
                            }
                            layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                        }
                    },
                    update = { playerView ->
                        if (playerView.player !== exoPlayer) {
                            playerView.player = exoPlayer
                        }
                        playerView.resizeMode = if (isLivePlayback) {
                            AspectRatioFrameLayout.RESIZE_MODE_FIT
                        } else {
                            AspectRatioFrameLayout.RESIZE_MODE_FIT
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                if (isLoading) SmartiflyLoader(modifier = Modifier.align(Alignment.Center))

                // Center HUD Overlay
                androidx.compose.animation.AnimatedVisibility(
                    visible = centerHudIcon != null,
                    enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.scaleIn(initialScale = 0.5f),
                    exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.scaleOut(targetScale = 1.5f),
                    modifier = Modifier.align(Alignment.Center)
                ) {
                    centerHudIcon?.let { hudIcon ->
                        val iconVector = when (hudIcon) {
                            HudIcon.Play -> SmartiflyIcons.Play
                            HudIcon.Pause -> SmartiflyIcons.Pause
                            HudIcon.SeekForward -> SmartiflyIcons.FastForward
                            HudIcon.SeekBackward -> SmartiflyIcons.FastRewind
                        }
                        Box(
                            modifier = Modifier
                                .size(90.dp)
                                .background(Color.Black.copy(alpha = 0.5f), androidx.compose.foundation.shape.CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = iconVector,
                                contentDescription = null,
                                tint = PrimaryRed,
                                modifier = Modifier.size(56.dp)
                            )
                        }
                    }
                }

                if (!isInPipMode) {
                    val isLive = isLivePlayback
                    PlayerControls(
                        isVisible = showControls && !showSettings && playbackError == null,
                        title = playbackRequest.title,
                        isPlaying = isPlaying,
                        onPlayPause = {
                            if (isPlaying) {
                                exoPlayer.pause()
                                centerHudIcon = HudIcon.Pause
                                hudTriggerCount++
                            } else {
                                exoPlayer.play()
                                centerHudIcon = HudIcon.Play
                                hudTriggerCount++
                            }
                            isPlaying = !isPlaying
                            lastInteractionAtMs = System.currentTimeMillis()
                        },
                        onSeekForward = if (isLive) null else ({
                            val target = (exoPlayer.currentPosition + 10000L).coerceAtMost(exoPlayer.duration)
                            exoPlayer.seekTo(target)
                            centerHudIcon = HudIcon.SeekForward
                            hudTriggerCount++
                            lastInteractionAtMs = System.currentTimeMillis()
                        }),
                        onSeekBackward = if (isLive) null else ({
                            val target = (exoPlayer.currentPosition - 10000L).coerceAtLeast(0L)
                            exoPlayer.seekTo(target)
                            centerHudIcon = HudIcon.SeekBackward
                            hudTriggerCount++
                            lastInteractionAtMs = System.currentTimeMillis()
                        }),
                        onPreviousLive = if (isLive && currentLiveIndex >= 0 && channelList.isNotEmpty()) {
                            {
                                val previousIndex = (currentLiveIndex - 1 + channelList.size) % channelList.size
                                onPlaybackRequestChange(PlaybackRequest.Live(channelList[previousIndex]))
                                lastInteractionAtMs = System.currentTimeMillis()
                            }
                        } else null,
                        onNextLive = if (isLive && currentLiveIndex >= 0 && channelList.isNotEmpty()) {
                            {
                                val nextIndex = (currentLiveIndex + 1) % channelList.size
                                onPlaybackRequestChange(PlaybackRequest.Live(channelList[nextIndex]))
                                lastInteractionAtMs = System.currentTimeMillis()
                            }
                        } else null,
                        onBack = onBack,
                        onSettingsClick = {
                            showSettings = true
                            lastInteractionAtMs = System.currentTimeMillis()
                        },
                        showFavoriteToggle = isLive,
                        isFavorite = isLiveFavorite,
                        onFavoriteToggle = if (isLive) {
                            {
                                scope.launch {
                                    val target = !isLiveFavorite
                                    runCatching { repository.setLiveFavorite(playbackRequest.id, target) }
                                        .onSuccess {
                                            isLiveFavorite = target
                                            Toast.makeText(
                                                context,
                                                if (target) "Added to Favorites" else "Removed from Favorites",
                                                Toast.LENGTH_SHORT
                                            ).show()
                                        }
                                }
                                lastInteractionAtMs = System.currentTimeMillis()
                            }
                        } else {
                            null
                        },
                        progress = if (isLive) 0f else playbackProgress,
                        currentTimeMs = currentTime,
                        durationMs = duration,
                        isScrubbing = isScrubbing,
                        scrubTargetMs = scrubTargetMs,
                        onScrubStart = {
                            isScrubbing = true
                            scrubTargetMs = currentTime
                            lastInteractionAtMs = System.currentTimeMillis()
                        },
                        onScrubUpdate = { target ->
                            scrubTargetMs = target
                            lastInteractionAtMs = System.currentTimeMillis()
                        },
                        onScrubCommit = { target ->
                            exoPlayer.seekTo(target)
                            isScrubbing = false
                            val delta = target - currentTime
                            centerHudIcon = if (delta >= 0) HudIcon.SeekForward else HudIcon.SeekBackward
                            hudTriggerCount++
                            lastInteractionAtMs = System.currentTimeMillis()
                        },
                        onScrubCancel = {
                            isScrubbing = false
                            lastInteractionAtMs = System.currentTimeMillis()
                        },
                        badges = playbackMetadata.badges
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

                val errorRetryFocusRequester = remember { FocusRequester() }
                LaunchedEffect(playbackError) {
                    if (playbackError != null) {
                        delay(100L)
                        try {
                            errorRetryFocusRequester.requestFocus()
                        } catch (e: Exception) {}
                    }
                }

                playbackError?.let { message ->
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp)
                            .focusable()
                    ) {
                        Column(
                            modifier = Modifier
                                .background(Color.Black.copy(alpha = 0.82f))
                                .padding(horizontal = 24.dp, vertical = 20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = if (isLivePlayback) "Live Playback Problem" else "Playback Problem",
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = message,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(18.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Button(
                                    onClick = {
                                        playbackError = null
                                        playerSessionKey += 1
                                    },
                                    modifier = Modifier.focusRequester(errorRetryFocusRequester),
                                    colors = ButtonDefaults.colors(
                                        containerColor = PrimaryRed,
                                        focusedContainerColor = Color.White,
                                        focusedContentColor = Color.Black
                                    )
                                ) {
                                    Text(if (isLivePlayback) "Retry Stream" else "Retry")
                                }
                                if (isLivePlayback && currentLiveIndex >= 0 && channelList.size > 1) {
                                    Spacer(modifier = Modifier.padding(horizontal = 6.dp))
                                    OutlinedButton(
                                        onClick = {
                                            val nextIndex = (currentLiveIndex + 1) % channelList.size
                                            playbackError = null
                                            onPlaybackRequestChange(PlaybackRequest.Live(channelList[nextIndex]))
                                        }
                                    ) {
                                        Text("Next Channel")
                                    }
                                }
                            }
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
