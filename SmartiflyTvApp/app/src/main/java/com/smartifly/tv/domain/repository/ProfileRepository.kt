package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.ProfileSet
import com.smartifly.tv.domain.model.UserProfile
import kotlinx.coroutines.flow.Flow

interface ProfileRepository {
    val profileSetFlow: Flow<ProfileSet>

    suspend fun ensureDefaultProfile(username: String)
    suspend fun setActiveProfile(profileId: String)
    suspend fun clearActiveProfile()
    suspend fun addProfile(name: String, avatarSeed: Int): UserProfile
    suspend fun updateProfile(profileId: String, transform: (UserProfile) -> UserProfile): Boolean
    suspend fun deleteProfile(profileId: String): Boolean
    suspend fun verifyProfilePin(profileId: String, pin: String): Boolean
    suspend fun setProfilePin(profileId: String, pin: String): Boolean
    suspend fun clearProfilePin(profileId: String): Boolean
}
