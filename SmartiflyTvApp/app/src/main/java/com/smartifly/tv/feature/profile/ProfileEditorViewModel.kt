package com.smartifly.tv.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.model.UserProfile
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileEditorState(
    val profiles: List<UserProfile> = emptyList(),
    val activeProfileId: String? = null,
    val errorMessage: String? = null,
)

class ProfileEditorViewModel(
    private val profileRepository: ProfileRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileEditorState())
    val state: StateFlow<ProfileEditorState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            profileRepository.profileSetFlow.collect { profileSet ->
                _state.update {
                    it.copy(
                        profiles = profileSet.profiles,
                        activeProfileId = profileSet.activeProfileId
                    )
                }
            }
        }
    }

    fun clearError() {
        _state.update { it.copy(errorMessage = null) }
    }

    fun saveProfile(
        profileId: String?,
        name: String,
        avatarSeed: Int,
        isKidsProfile: Boolean,
        maxRating: String,
        pinEnabled: Boolean,
        pin: String,
        onSuccess: () -> Unit,
    ) {
        val cleanName = name.trim()
        if (cleanName.isBlank()) {
            _state.update { it.copy(errorMessage = "Profile name is required.") }
            return
        }
        if (pinEnabled && profileId == null && pin.isBlank()) {
            _state.update { it.copy(errorMessage = "Enter a 4-digit PIN for new protected profile.") }
            return
        }
        if (pinEnabled && profileId != null) {
            val existing = _state.value.profiles.firstOrNull { it.id == profileId }
            if (existing != null && existing.pinHash == null && pin.isBlank()) {
                _state.update { it.copy(errorMessage = "Enter a 4-digit PIN to enable protection.") }
                return
            }
        }

        viewModelScope.launch {
            runCatching {
                val targetId = if (profileId == null) {
                    val created = profileRepository.addProfile(
                        name = cleanName,
                        avatarSeed = avatarSeed
                    )
                    created.id
                } else {
                    profileId
                }

                val updated = profileRepository.updateProfile(targetId) { profile ->
                    profile.copy(
                        name = cleanName,
                        avatarSeed = avatarSeed,
                        isKidsProfile = isKidsProfile,
                        maxRating = maxRating
                    )
                }
                if (!updated) error("Unable to save profile.")

                if (pinEnabled) {
                    if (pin.isNotBlank()) {
                        val pinSaved = profileRepository.setProfilePin(targetId, pin)
                        if (!pinSaved) error("PIN must be exactly 4 digits.")
                    }
                } else {
                    profileRepository.clearProfilePin(targetId)
                }
            }.onSuccess {
                _state.update { it.copy(errorMessage = null) }
                onSuccess()
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        errorMessage = error.message ?: "Failed to save profile."
                    )
                }
            }
        }
    }

    fun deleteProfile(
        profileId: String,
        onSuccess: () -> Unit,
    ) {
        viewModelScope.launch {
            val deleted = profileRepository.deleteProfile(profileId)
            if (deleted) {
                _state.update { it.copy(errorMessage = null) }
                onSuccess()
            } else {
                _state.update {
                    it.copy(errorMessage = "Cannot delete this profile right now.")
                }
            }
        }
    }

    companion object {
        fun factory(
            profileRepository: ProfileRepository,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return ProfileEditorViewModel(profileRepository) as T
            }
        }
    }
}
