package com.smartifly.tv.feature.profile

import com.smartifly.tv.domain.model.ProfileSet
import com.smartifly.tv.domain.model.UserProfile
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update

internal fun previewProfileRepository(): ProfileRepository {
    return object : ProfileRepository {
        private val profileState = MutableStateFlow(
            ProfileSet(
                profiles = listOf(
                    UserProfile(id = "p1", name = "Tom", avatarSeed = 3, pinRequired = false),
                    UserProfile(id = "p2", name = "Europe Kids", avatarSeed = 8, isKidsProfile = true, pinRequired = true, pinHash = "preview"),
                    UserProfile(id = "p3", name = "Starshare", avatarSeed = 12, pinRequired = false)
                ),
                activeProfileId = "p1"
            )
        )

        override val profileSetFlow: Flow<ProfileSet> = profileState

        override suspend fun ensureDefaultProfile(username: String) = Unit

        override suspend fun setActiveProfile(profileId: String) {
            profileState.update { current ->
                if (current.profiles.any { it.id == profileId }) {
                    current.copy(activeProfileId = profileId)
                } else {
                    current
                }
            }
        }

        override suspend fun clearActiveProfile() {
            profileState.update { it.copy(activeProfileId = null) }
        }

        override suspend fun addProfile(name: String, avatarSeed: Int): UserProfile {
            val newProfile = UserProfile(
                id = "p${profileState.value.profiles.size + 1}",
                name = name,
                avatarSeed = avatarSeed.coerceIn(1, 24)
            )
            profileState.update { it.copy(profiles = it.profiles + newProfile) }
            return newProfile
        }

        override suspend fun updateProfile(profileId: String, transform: (UserProfile) -> UserProfile): Boolean {
            var updated = false
            profileState.update { current ->
                val newProfiles = current.profiles.map { profile ->
                    if (profile.id == profileId) {
                        updated = true
                        transform(profile)
                    } else {
                        profile
                    }
                }
                current.copy(profiles = newProfiles)
            }
            return updated
        }

        override suspend fun deleteProfile(profileId: String): Boolean {
            val before = profileState.value.profiles.size
            profileState.update { current ->
                val remaining = current.profiles.filterNot { it.id == profileId }
                current.copy(
                    profiles = remaining,
                    activeProfileId = current.activeProfileId?.takeIf { id -> remaining.any { it.id == id } }
                )
            }
            return profileState.value.profiles.size < before
        }

        override suspend fun verifyProfilePin(profileId: String, pin: String): Boolean {
            val target = profileState.value.profiles.firstOrNull { it.id == profileId } ?: return false
            return if (target.pinRequired) pin == "1234" else true
        }

        override suspend fun setProfilePin(profileId: String, pin: String): Boolean {
            if (!pin.matches(Regex("^\\d{4}$"))) return false
            return updateProfile(profileId) { it.copy(pinRequired = true, pinHash = "preview") }
        }

        override suspend fun clearProfilePin(profileId: String): Boolean {
            return updateProfile(profileId) { it.copy(pinRequired = false, pinHash = null) }
        }
    }
}
