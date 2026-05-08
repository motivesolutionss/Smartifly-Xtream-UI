package com.smartifly.tv.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val profileRepository: ProfileRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            profileRepository.profileSetFlow.collect { profileSet ->
                _state.update {
                    it.copy(
                        profiles = profileSet.profiles,
                        activeProfileId = profileSet.activeProfileId,
                    )
                }
            }
        }
    }

    fun selectProfile(profileId: String, onSelected: () -> Unit) {
        viewModelScope.launch {
            profileRepository.setActiveProfile(profileId)
            onSelected()
        }
    }

    fun createProfile(name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            val nextSeed = (_state.value.profiles.size % 24) + 1
            profileRepository.addProfile(name = name.trim(), avatarSeed = nextSeed)
        }
    }

    companion object {
        fun factory(
            profileRepository: ProfileRepository,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return ProfileViewModel(profileRepository) as T
            }
        }
    }
}

