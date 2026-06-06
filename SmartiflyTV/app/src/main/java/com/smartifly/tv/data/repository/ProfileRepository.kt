package com.smartifly.tv.data.repository

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.IOException
import retrofit2.HttpException

class ProfileRepository(
    private val context: Context,
    private val api: com.smartifly.tv.data.remote.SmartiflyApi,
    private val sessionManager: com.smartifly.tv.data.SessionManager
) {
    private fun isLegacyKidsProfile(profile: UserProfile): Boolean {
        val normalizedId = profile.id.trim().lowercase()
        val normalizedName = profile.name.trim().lowercase()
        return normalizedId.endsWith("_kids") || normalizedName == "kids"
    }

    private fun sanitizeProfiles(profiles: List<UserProfile>): List<UserProfile> {
        return profiles.filterNot(::isLegacyKidsProfile)
    }

    private fun isRemoteBackendUser(userId: String?): Boolean {
        return !userId.isNullOrBlank() && userId.all { it.isDigit() }
    }

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

    private val sharedPrefs by lazy {
        context.getSharedPreferences("smartifly_profiles_prefs", Context.MODE_PRIVATE)
    }
    private val gson = Gson()

    private val presetColors = listOf("#E50914", "#00F3FF", "#FFD700", "#6B7280")

    private fun getRawLocalProfiles(userId: String): List<UserProfile> {
        val json = sharedPrefs.getString("profiles_$userId", null) ?: return emptyList()
        val type = object : TypeToken<List<UserProfile>>() {}.type
        return try {
            sanitizeProfiles(gson.fromJson(json, type))
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun getLocalProfiles(userId: String): List<UserProfile> {
        val raw = getRawLocalProfiles(userId)
        if (raw.isEmpty()) {
            val displayName = if (userId == "local-default") {
                "Primary"
            } else {
                userId.substringAfter("local:").substringBefore("@").ifBlank { "Primary" }
            }
            val default = listOf(
                UserProfile(
                    id = if (userId == "local-default") "local-default" else "${userId}_primary",
                    name = displayName,
                    avatarUrl = "",
                    primaryColor = presetColors[0]
                )
            )
            saveLocalProfiles(userId, default)
            return default
        }
        val sanitized = sanitizeProfiles(raw)
        if (sanitized.size != raw.size) {
            saveLocalProfiles(userId, sanitized)
        }
        return sanitized
    }

    private fun saveLocalProfiles(userId: String, profiles: List<UserProfile>) {
        sharedPrefs.edit().putString("profiles_$userId", gson.toJson(profiles)).apply()
    }

    suspend fun getProfiles(): List<UserProfile> {
        val userId = sessionManager.getBoundUserId()
        if (userId.isNullOrBlank()) {
            return getLocalProfiles("local-default")
        }

        // Manual Xtream identity (non-numeric backend user id) should use local profile mode.
        if (!userId.all { it.isDigit() }) {
            return getLocalProfiles(userId)
        }

        return try {
            val response = api.fetchProfiles(userId)
            if (response["success"] == true) {
                val data = response["data"].asMapList()
                val apiProfiles = sanitizeProfiles(data.map { map ->
                    UserProfile(
                        id = map["id"]?.toString() ?: "",
                        name = map["name"]?.toString() ?: "Profile",
                        avatarUrl = map["avatarUrl"] as? String ?: "",
                        pin = map["pin"] as? String,
                        primaryColor = map["primaryColor"] as? String
                    )
                }.filter { it.id.isNotBlank() })

                val rawLocal = getRawLocalProfiles(userId)
                val activeLocal = if (rawLocal.isEmpty() && apiProfiles.isEmpty()) {
                    getLocalProfiles(userId)
                } else {
                    sanitizeProfiles(rawLocal)
                }
                
                // Merge local-only custom added profiles that are not on API yet
                val merged = sanitizeProfiles((apiProfiles + activeLocal).distinctBy { it.id })
                if (rawLocal.isEmpty() && apiProfiles.isNotEmpty()) {
                    saveLocalProfiles(userId, apiProfiles)
                } else if (activeLocal.size != rawLocal.size || merged.size != activeLocal.size) {
                    saveLocalProfiles(userId, merged)
                }
                merged
            } else {
                getLocalProfiles(userId)
            }
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyProfile", "Profiles network issue: ${e.message}")
            getLocalProfiles(userId)
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyProfile", "Profiles HTTP ${e.code()}")
            getLocalProfiles(userId)
        } catch (e: RuntimeException) {
            android.util.Log.e("SmartiflyProfile", "Profiles unexpected error: ${e.message}")
            getLocalProfiles(userId)
        }
    }

    suspend fun selectProfile(profile: UserProfile) {
        _selectedProfile.value = profile
        val userId = sessionManager.getBoundUserId()
        if (!isRemoteBackendUser(userId)) return
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

    suspend fun createProfile(name: String, pin: String?, avatarUrl: String = "", primaryColor: String? = null) {
        val userId = sessionManager.getBoundUserId() ?: "local-default"
        val currentLocal = getLocalProfiles(userId).toMutableList()
        if (currentLocal.size >= 5) {
            return
        }
        
        val newId = "profile_${System.currentTimeMillis()}"
        val newProfile = UserProfile(
            id = newId,
            name = name,
            avatarUrl = avatarUrl,
            pin = pin,
            primaryColor = primaryColor ?: presetColors[currentLocal.size % presetColors.size]
        )
        
        currentLocal.add(newProfile)
        saveLocalProfiles(userId, currentLocal)
    }

    suspend fun deleteProfile(profileId: String) {
        val userId = sessionManager.getBoundUserId() ?: "local-default"
        val currentLocal = getLocalProfiles(userId).toMutableList()
        currentLocal.removeAll { it.id == profileId }
        saveLocalProfiles(userId, currentLocal)
    }

    suspend fun updateProfile(profileId: String, name: String, avatarUrl: String, pin: String?) {
        val userId = sessionManager.getBoundUserId() ?: "local-default"
        
        // Update local cache
        val currentLocal = getLocalProfiles(userId).toMutableList()
        val index = currentLocal.indexOfFirst { it.id == profileId }
        if (index != -1) {
            val old = currentLocal[index]
            currentLocal[index] = old.copy(
                name = name,
                avatarUrl = avatarUrl,
                pin = pin
            )
            saveLocalProfiles(userId, currentLocal)
        }

        // Try network update if it is a digit-only userId
        if (userId != "local-default" && userId.all { it.isDigit() }) {
            try {
                api.updateProfile(
                    mapOf(
                        "profileId" to profileId,
                        "name" to name,
                        "avatarUrl" to avatarUrl,
                        "pin" to pin
                    )
                )
            } catch (e: Exception) {
                android.util.Log.w("SmartiflyProfile", "Network update failed: ${e.message}")
            }
        }
    }

    fun clearSelectedProfile() {
        _selectedProfile.value = null
    }
}
