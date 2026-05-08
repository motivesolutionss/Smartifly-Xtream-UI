package com.smartifly.tv.features.profiles

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfilesViewModel(private val repository: ProfileRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfilesUiState>(ProfilesUiState.Loading)
    val uiState: StateFlow<ProfilesUiState> = _uiState

    init {
        loadProfiles()
    }

    fun loadProfiles() {
        viewModelScope.launch {
            _uiState.value = ProfilesUiState.Loading
            try {
                val profiles = repository.getProfiles()
                _uiState.value = ProfilesUiState.Success(profiles)
            } catch (e: Exception) {
                _uiState.value = ProfilesUiState.Error(e.message ?: "Failed to load profiles")
            }
        }
    }

    fun selectProfile(profile: UserProfile) {
        repository.selectProfile(profile)
    }
}
