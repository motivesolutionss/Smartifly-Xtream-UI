package com.smartifly.tv.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class WatchProgress(
    val contentId: String,
    val positionMs: Long,
    val durationMs: Long,
    val lastUpdated: Long,
    val metadata: MovieMetadata
)

class ResumeWatchingRepository(
    private val context: Context,
    private val api: SmartiflyApi
) {
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)

    private fun getProgressKey(profileId: String) = stringPreferencesKey("resume_watching_$profileId")

    fun getAllWatchProgress(profileId: String): Flow<List<WatchProgress>> {
        return context.dataStore.data.map { preferences ->
            val json = preferences[getProgressKey(profileId)] ?: "[]"
            val type = object : TypeToken<List<WatchProgress>>() {}.type
            gson.fromJson<List<WatchProgress>>(json, type).sortedByDescending { it.lastUpdated }
        }
    }

    fun getWatchProgress(profileId: String, contentId: String): Flow<WatchProgress?> {
        return getAllWatchProgress(profileId).map { list ->
            list.find { it.contentId == contentId }
        }
    }

    suspend fun saveProgress(profileId: String, progress: WatchProgress) {
        context.dataStore.edit { preferences ->
            val key = getProgressKey(profileId)
            val currentJson = preferences[key] ?: "[]"
            val type = object : TypeToken<MutableList<WatchProgress>>() {}.type
            val currentList: MutableList<WatchProgress> = gson.fromJson(currentJson, type)

            // Remove 95% watched content
            val progressPercent = progress.positionMs.toFloat() / progress.durationMs.toFloat()
            if (progressPercent > 0.95f) {
                currentList.removeAll { it.contentId == progress.contentId }
            } else {
                currentList.removeAll { it.contentId == progress.contentId }
                currentList.add(progress)
            }

            val updatedJson = gson.toJson(currentList)
            preferences[key] = updatedJson
            
            // Enterprise Sync: Fire and forget to Smartifly Cloud
            scope.launch {
                try {
                    api.syncResumeWatching(mapOf(
                        "profileId" to profileId,
                        "progressList" to currentList
                    ))
                } catch (e: Exception) {
                    android.util.Log.e("SmartiflySync", "Failed to sync resume to cloud: ${e.message}")
                }
            }
        }
    }

    /**
     * Enterprise Feature: Pulls resume status from other devices.
     */
    suspend fun syncFromCloud(profileId: String) {
        try {
            val response = api.fetchResumeWatching(profileId)
            val data = response["data"] as? List<*> ?: return
            
            val type = object : TypeToken<List<WatchProgress>>() {}.type
            val cloudList: List<WatchProgress> = gson.fromJson(gson.toJson(data), type)
            
            if (cloudList.isNotEmpty()) {
                context.dataStore.edit { preferences ->
                    val key = getProgressKey(profileId)
                    val currentJson = preferences[key] ?: "[]"
                    val currentList: MutableList<WatchProgress> = gson.fromJson(currentJson, type)
                    
                    // Merge logic: Keep the one with the latest lastUpdated timestamp
                    val mergedList = (currentList + cloudList)
                        .groupBy { it.contentId }
                        .map { (_, versions) -> versions.maxBy { it.lastUpdated } }
                        .sortedByDescending { it.lastUpdated }
                    
                    preferences[key] = gson.toJson(mergedList)
                }
                android.util.Log.d("SmartiflySync", "Cloud Resume SYNCED for profile $profileId")
            }
        } catch (e: Exception) {
            android.util.Log.e("SmartiflySync", "Failed to fetch resume from cloud: ${e.message}")
        }
    }
}
