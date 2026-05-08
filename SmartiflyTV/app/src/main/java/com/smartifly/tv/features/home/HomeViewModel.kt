package com.smartifly.tv.features.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.ContentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class HomeViewModel(
    private val repository: com.smartifly.tv.data.repository.ContentRepository,
    private val resumeRepository: com.smartifly.tv.data.ResumeWatchingRepository?,
    private val recommendationRepository: com.smartifly.tv.data.repository.RecommendationRepository?,
    private val activeProfile: com.smartifly.tv.data.models.UserProfile,
    private val watchProgressProvider: ((String) -> Flow<List<WatchProgress>>)? = null,
    private val personalizedHomeProvider: (suspend (String, com.smartifly.tv.data.models.UserProfile) -> List<HomeSection>)? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState

    init {
        loadHomeData()
        observeResumeWatching()
    }

    private fun observeResumeWatching() {
        val progressFlow = watchProgressProvider
            ?: { profileId: String -> requireNotNull(resumeRepository).getAllWatchProgress(profileId) }

        viewModelScope.launch {
            progressFlow(activeProfile.id).collect { progressList ->
                val currentState = _uiState.value
                if (currentState is HomeUiState.Success) {
                    val continueWatchingSection = HomeSection(
                        title = "Continue Watching",
                        items = progressList.map { it.metadata },
                        progressList = progressList.map { it.positionMs.toFloat() / it.durationMs.toFloat() }
                    )
                    
                    val newSections = currentState.sections.toMutableList()
                    newSections.removeAll { it.title == "Continue Watching" }
                    if (progressList.isNotEmpty()) {
                        newSections.add(0, continueWatchingSection)
                    }
                    _uiState.value = currentState.copy(sections = newSections)
                }
            }
        }
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            try {
                val response = repository.getHomeData()
                val personalizedSections = if (personalizedHomeProvider != null) {
                    personalizedHomeProvider.invoke(activeProfile.id, activeProfile)
                } else {
                    requireNotNull(recommendationRepository).getPersonalizedHome(activeProfile.id, activeProfile)
                }
                
                _uiState.value = HomeUiState.Success(
                    heroMovie = response.hero.toDomain(),
                    sections = personalizedSections
                )
            } catch (e: Exception) {
                _uiState.value = HomeUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }
}
