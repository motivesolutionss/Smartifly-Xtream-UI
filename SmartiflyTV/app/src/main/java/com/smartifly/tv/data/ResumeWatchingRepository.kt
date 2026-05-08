package com.smartifly.tv.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartifly.tv.data.models.MovieMetadata
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

data class WatchProgress(
    val contentId: String,
    val positionMs: Long,
    val durationMs: Long,
    val lastUpdated: Long,
    val metadata: MovieMetadata
)

class ResumeWatchingRepository(private val context: Context) {
    private val gson = Gson()

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

            preferences[key] = gson.toJson(currentList)
        }
    }
}
