package com.smartifly.tv.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.launch

class PinEntryViewModel(
    private val profileRepository: ProfileRepository,
) : ViewModel() {
    fun submitPin(
        profileId: String,
        pin: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        if (!PIN_REGEX.matches(pin)) {
            onError("PIN must be exactly 4 digits.")
            return
        }

        viewModelScope.launch {
            runCatching {
                val verified = profileRepository.verifyProfilePin(profileId, pin)
                if (!verified) error("Incorrect PIN.")
                profileRepository.setActiveProfile(profileId)
            }.onSuccess {
                onSuccess()
            }.onFailure { error ->
                onError(error.message ?: "PIN verification failed.")
            }
        }
    }

    companion object {
        fun factory(
            profileRepository: ProfileRepository,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return PinEntryViewModel(profileRepository) as T
            }
        }

        private val PIN_REGEX = Regex("^\\d{4}$")
    }
}
