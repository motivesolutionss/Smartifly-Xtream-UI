package com.smartifly.tv.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartifly.tv.data.dataStore
import com.smartifly.tv.data.models.MovieMetadata
import android.util.Log
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.io.IOException
import retrofit2.HttpException

class WatchlistRepository(
    private val context: Context,
    private val cloudRepository: com.smartifly.tv.data.cloud.CloudWatchlistRepository
) {
    private companion object {
        private const val TAG = "SmartiflyWatchlist"
    }
    private val gson = Gson()

    private fun getWatchlistKey(profileId: String) = stringPreferencesKey("watchlist_$profileId")

    fun getWatchlist(profileId: String): Flow<List<MovieMetadata>> {
        return context.dataStore.data.map { preferences ->
            val json = preferences[getWatchlistKey(profileId)] ?: "[]"
            val type = object : TypeToken<List<MovieMetadata>>() {}.type
            gson.fromJson(json, type)
        }
    }

    suspend fun addToWatchlist(profileId: String, movie: MovieMetadata) {
        context.dataStore.edit { preferences ->
            val currentJson = preferences[getWatchlistKey(profileId)] ?: "[]"
            val type = object : TypeToken<MutableList<MovieMetadata>>() {}.type
            val currentList: MutableList<MovieMetadata> = gson.fromJson(currentJson, type)
            
            if (currentList.none { it.id == movie.id }) {
                currentList.add(movie)
                preferences[getWatchlistKey(profileId)] = gson.toJson(currentList)
            }
        }
        // Sync to cloud
        try {
            cloudRepository.addToCloudWatchlist(profileId, movie)
        } catch (e: IOException) {
            Log.w(TAG, "cloud_sync_add_network_failed profile=$profileId movieId=${movie.id}", e)
        } catch (e: HttpException) {
            Log.w(TAG, "cloud_sync_add_http_failed profile=$profileId movieId=${movie.id} code=${e.code()}", e)
        } catch (e: RuntimeException) {
            Log.w(TAG, "cloud_sync_add_failed profile=$profileId movieId=${movie.id}", e)
        }
    }

    suspend fun removeFromWatchlist(profileId: String, movieId: String) {
        context.dataStore.edit { preferences ->
            val currentJson = preferences[getWatchlistKey(profileId)] ?: "[]"
            val type = object : TypeToken<MutableList<MovieMetadata>>() {}.type
            val currentList: MutableList<MovieMetadata> = gson.fromJson(currentJson, type)
            
            currentList.removeAll { it.id == movieId }
            preferences[getWatchlistKey(profileId)] = gson.toJson(currentList)
        }
        // Sync to cloud
        try {
            cloudRepository.removeFromCloudWatchlist(profileId, movieId)
        } catch (e: IOException) {
            Log.w(TAG, "cloud_sync_remove_network_failed profile=$profileId movieId=$movieId", e)
        } catch (e: HttpException) {
            Log.w(TAG, "cloud_sync_remove_http_failed profile=$profileId movieId=$movieId code=${e.code()}", e)
        } catch (e: RuntimeException) {
            Log.w(TAG, "cloud_sync_remove_failed profile=$profileId movieId=$movieId", e)
        }
    }
    
    suspend fun syncFromCloud(profileId: String) {
        try {
            val cloudItems = cloudRepository.fetchCloudWatchlist(profileId)
            context.dataStore.edit { preferences ->
                preferences[getWatchlistKey(profileId)] = gson.toJson(cloudItems)
            }
        } catch (e: IOException) {
            Log.w(TAG, "cloud_sync_fetch_network_failed profile=$profileId", e)
        } catch (e: HttpException) {
            Log.w(TAG, "cloud_sync_fetch_http_failed profile=$profileId code=${e.code()}", e)
        } catch (e: RuntimeException) {
            Log.w(TAG, "cloud_sync_fetch_failed profile=$profileId", e)
        }
    }

    fun isInWatchlist(profileId: String, movieId: String): Flow<Boolean> {
        return getWatchlist(profileId).map { list -> list.any { it.id == movieId } }
    }
}
