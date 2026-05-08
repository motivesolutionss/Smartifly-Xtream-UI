package com.smartifly.tv.player

import androidx.media3.exoplayer.ExoPlayer
import com.smartifly.tv.data.ResumeWatchingRepository
import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.models.MovieMetadata
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class WatchProgressManager(
    private val profileId: String,
    private val movie: MovieMetadata,
    private val player: ExoPlayer,
    private val repository: ResumeWatchingRepository,
    private val scope: CoroutineScope
) {
    private var progressJob: Job? = null

    fun startTracking() {
        progressJob?.cancel()
        progressJob = scope.launch(Dispatchers.IO) {
            while (true) {
                saveCurrentProgress()
                delay(10000)
            }
        }
    }

    fun stopTracking() {
        progressJob?.cancel()
        scope.launch(Dispatchers.IO) {
            saveCurrentProgress()
        }
    }

    private suspend fun saveCurrentProgress() {
        val position = player.currentPosition
        val duration = player.duration
        
        if (duration <= 0) return

        repository.saveProgress(
            profileId = profileId,
            progress = WatchProgress(
                contentId = movie.id,
                positionMs = position,
                durationMs = duration,
                lastUpdated = System.currentTimeMillis(),
                metadata = movie
            )
        )
    }
}
