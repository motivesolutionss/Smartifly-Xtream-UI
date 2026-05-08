package com.smartifly.tv.data.repository

import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.domain.model.ProfileSet
import com.smartifly.tv.domain.model.UserProfile
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import java.util.UUID

class DefaultProfileRepository(
    private val preferences: AppPreferencesDataSource,
) : ProfileRepository {
    override val profileSetFlow: Flow<ProfileSet> = preferences.profileSetFlow

    override suspend fun ensureDefaultProfile(username: String) {
        val existing = profileSetFlow.first()
        if (existing.profiles.isNotEmpty()) return

        val displayName = username.substringBefore("@")
            .replace('_', ' ')
            .replace('-', ' ')
            .trim()
            .ifBlank { "Main" }
            .replaceFirstChar { it.uppercase() }

        val profile = UserProfile(
            id = UUID.randomUUID().toString(),
            name = displayName,
            avatarSeed = 1,
        )

        preferences.saveProfileSet(
            ProfileSet(
                profiles = listOf(profile),
                activeProfileId = null,
            )
        )
    }

    override suspend fun setActiveProfile(profileId: String) {
        val existing = profileSetFlow.first()
        preferences.saveProfileSet(existing.copy(activeProfileId = profileId))
    }

    override suspend fun clearActiveProfile() {
        val existing = profileSetFlow.first()
        preferences.saveProfileSet(existing.copy(activeProfileId = null))
    }

    override suspend fun addProfile(name: String, avatarSeed: Int): UserProfile {
        val existing = profileSetFlow.first()
        val profile = UserProfile(
            id = UUID.randomUUID().toString(),
            name = name,
            avatarSeed = avatarSeed,
        )
        preferences.saveProfileSet(existing.copy(profiles = existing.profiles + profile))
        return profile
    }

    override suspend fun updateProfile(
        profileId: String,
        transform: (UserProfile) -> UserProfile,
    ): Boolean {
        val existing = profileSetFlow.first()
        val index = existing.profiles.indexOfFirst { it.id == profileId }
        if (index < 0) return false

        val updatedProfiles = existing.profiles.toMutableList()
        updatedProfiles[index] = transform(updatedProfiles[index])
        preferences.saveProfileSet(existing.copy(profiles = updatedProfiles))
        return true
    }

    override suspend fun deleteProfile(profileId: String): Boolean {
        val existing = profileSetFlow.first()
        if (existing.profiles.size <= 1) return false
        if (existing.activeProfileId == profileId) return false
        if (existing.profiles.none { it.id == profileId }) return false

        preferences.saveProfileSet(
            existing.copy(
                profiles = existing.profiles.filterNot { it.id == profileId }
            )
        )
        return true
    }

    override suspend fun verifyProfilePin(profileId: String, pin: String): Boolean {
        val existing = profileSetFlow.first()
        val profile = existing.profiles.firstOrNull { it.id == profileId } ?: return false
        if (!profile.pinRequired) return true
        val hash = profile.pinHash ?: return false
        return hash == hashPin(pin)
    }

    override suspend fun setProfilePin(profileId: String, pin: String): Boolean {
        if (!PIN_REGEX.matches(pin)) return false
        return updateProfile(profileId) { profile ->
            profile.copy(
                pinRequired = true,
                pinHash = hashPin(pin)
            )
        }
    }

    override suspend fun clearProfilePin(profileId: String): Boolean {
        return updateProfile(profileId) { profile ->
            profile.copy(
                pinRequired = false,
                pinHash = null
            )
        }
    }

    private fun hashPin(pin: String): String {
        var hash = 0
        val salted = "$PIN_SALT$pin$PIN_SALT"
        salted.forEach { ch ->
            hash = ((hash shl 5) - hash) + ch.code
        }
        return hash.toString(36)
    }

    private companion object {
        val PIN_REGEX = Regex("^\\d{4}$")
        const val PIN_SALT = "smartifly_tv_pin_v1"
    }
}
