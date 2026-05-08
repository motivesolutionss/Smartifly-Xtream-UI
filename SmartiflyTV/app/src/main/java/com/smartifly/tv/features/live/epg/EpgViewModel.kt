package com.smartifly.tv.features.live.epg

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.LiveTvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class EpgUiState {
    object Loading : EpgUiState()
    data class Success(
        val channels: List<EpgChannel>,
        val startTime: Long, // The earliest time shown in grid
        val endTime: Long    // The latest time shown in grid
    ) : EpgUiState()
    data class Error(val message: String) : EpgUiState()
}

class EpgViewModel(private val repository: com.smartifly.tv.data.epg.EpgRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<EpgUiState>(EpgUiState.Loading)
    val uiState: StateFlow<EpgUiState> = _uiState

    init {
        loadEpgData()
    }

    fun loadEpgData() {
        viewModelScope.launch {
            _uiState.value = EpgUiState.Loading
            try {
                val now = System.currentTimeMillis()
                val startTime = now - (now % 3600000)
                
                val channelIds = (1..20).map { "$it" }
                val channels = repository.getEpgForChannels(channelIds)
                
                _uiState.value = EpgUiState.Success(
                    channels = channels,
                    startTime = startTime,
                    endTime = startTime + (24 * 3600000L)
                )
            } catch (e: Exception) {
                _uiState.value = EpgUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }

    private fun generateMockPrograms(channelId: String, start: Long, end: Long): List<EpgProgram> {
        val programs = mutableListOf<EpgProgram>()
        var current = start
        var count = 1
        while (current < end) {
            val duration = (30..120).random() * 60000L // 30-120 mins
            val programEnd = (current + duration).coerceAtMost(end)
            programs.add(
                EpgProgram(
                    id = "${channelId}_p$count",
                    title = "Program $count on $channelId",
                    startTime = current,
                    endTime = programEnd,
                    description = "Exciting content on $channelId starting at $current",
                    rating = "PG",
                    channelId = channelId
                )
            )
            current = programEnd
            count++
        }
        return programs
    }
}
