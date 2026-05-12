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
                // In a real enterprise app, we'd fetch from a secure storage or API
                val profiles = repository.getProfiles()
                _uiState.value = ProfilesUiState.Success(profiles)
            } catch (e: Exception) {
                _uiState.value = ProfilesUiState.Error(e.message ?: "Failed to load profiles")
            }
        }
    }

    /**
     * Verifies if the provided PIN is correct for the profile.
     */
    fun verifyPin(profile: UserProfile, pin: String): Boolean {
        return profile.pin == pin || profile.pin == null
    }

    /**
     * Professionally selects the profile and persists it.
     */
    fun selectProfile(profile: UserProfile) {
        viewModelScope.launch {
            repository.selectProfile(profile)
        }
    }

    /**
     * Updates profile details on the backend and refreshes the list.
     */
    fun updateProfile(profileId: String, name: String, avatarUrl: String, pin: String?) {
        viewModelScope.launch {
            try {
                repository.updateProfile(profileId, name, avatarUrl, pin)
                loadProfiles() // Refresh the list
            } catch (e: Exception) {
                // Log error
            }
        }
    }
}
