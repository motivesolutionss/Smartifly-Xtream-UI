package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ProfileRepository(private val api: SmartiflyApi) {
    
    private val _selectedProfile = MutableStateFlow<UserProfile?>(null)
    val selectedProfile: StateFlow<UserProfile?> = _selectedProfile

    suspend fun getProfiles(): List<UserProfile> {
        // Mocking for now, will connect to API later
        return listOf(
            UserProfile("1", "Aadi", "https://picsum.photos/seed/p1/200/200"),
            UserProfile("2", "Kajal", "https://picsum.photos/seed/p2/200/200"),
            UserProfile("3", "Kids", "https://picsum.photos/seed/p3/200/200", isKids = true)
        )
    }

    fun selectProfile(profile: UserProfile) {
        _selectedProfile.value = profile
    }
}
