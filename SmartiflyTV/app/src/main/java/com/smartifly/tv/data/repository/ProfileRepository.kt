package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.IOException
import retrofit2.HttpException

class ProfileRepository(
    private val api: com.smartifly.tv.data.remote.SmartiflyApi,
    private val sessionManager: com.smartifly.tv.data.SessionManager
) {
    private fun Any?.asMapList(): List<Map<String, Any>> =
        (this as? List<*>)?.mapNotNull { it as? Map<*, *> }
            ?.map { raw ->
                raw.entries.mapNotNull { (k, v) ->
                    val key = k as? String ?: return@mapNotNull null
                    val value = v ?: return@mapNotNull null
                    key to value
                }.toMap()
            }
            ?: emptyList()
    
    private val _selectedProfile = MutableStateFlow<UserProfile?>(null)
    val selectedProfile: StateFlow<UserProfile?> = _selectedProfile

    suspend fun getProfiles(): List<UserProfile> {
        val userId = sessionManager.getBoundUserId()
        if (userId.isNullOrBlank()) {
            // No backend-bound identity yet; keep UI functional with one local profile.
            return listOf(UserProfile(id = "local-default", name = "Primary", avatarUrl = "", isKids = false))
        }

        // Manual Xtream identity (non-numeric backend user id) should use local profile mode.
        if (!userId.all { it.isDigit() }) {
            val displayName = userId.substringAfter("local:").substringBefore("@").ifBlank { "Primary" }
            return listOf(
                UserProfile(
                    id = userId,
                    name = displayName,
                    avatarUrl = "https://api.dicebear.com/7.x/avataaars/png?seed=$displayName",
                    isKids = false
                )
            )
        }
        return try {
            val response = api.fetchProfiles(userId)
            if (response["success"] == true) {
                val data = response["data"].asMapList()
                data.map { map ->
                    UserProfile(
                        id = map["id"]?.toString() ?: "",
                        name = map["name"]?.toString() ?: "Profile",
                        avatarUrl = map["avatarUrl"] as? String ?: "https://api.dicebear.com/7.x/avataaars/png?seed=${map["name"]}",
                        isKids = map["isKids"] as? Boolean ?: false,
                        pin = map["pin"] as? String
                    )
                }.filter { it.id.isNotBlank() }
            } else emptyList()
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyProfile", "Profiles network issue: ${e.message}")
            emptyList()
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyProfile", "Profiles HTTP ${e.code()}")
            emptyList()
        } catch (e: RuntimeException) {
            android.util.Log.e("SmartiflyProfile", "Profiles unexpected error: ${e.message}")
            emptyList()
        }
    }

    suspend fun selectProfile(profile: UserProfile) {
        _selectedProfile.value = profile
        try {
            api.selectProfile(mapOf("profileId" to profile.id))
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyProfile", "Select profile network issue: ${e.message}")
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyProfile", "Select profile HTTP ${e.code()}")
        } catch (e: RuntimeException) {
            android.util.Log.e("SmartiflyProfile", "Select profile unexpected error: ${e.message}")
        }
    }

    suspend fun updateProfile(profileId: String, name: String, avatarUrl: String, pin: String?) {
        api.updateProfile(
            mapOf(
                "profileId" to profileId,
                "name" to name,
                "avatarUrl" to avatarUrl,
                "pin" to pin
            )
        )
    }
}
