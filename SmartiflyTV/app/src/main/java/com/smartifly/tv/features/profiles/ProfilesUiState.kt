package com.smartifly.tv.features.profiles

import com.smartifly.tv.data.models.UserProfile

sealed class ProfilesUiState {
    object Loading : ProfilesUiState()
    data class Success(val profiles: List<UserProfile>) : ProfilesUiState()
    data class Error(val message: String) : ProfilesUiState()
}
