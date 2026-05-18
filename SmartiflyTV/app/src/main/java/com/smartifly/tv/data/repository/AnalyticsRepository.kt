package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.SmartiflyApi
import java.io.IOException
import retrofit2.HttpException

class AnalyticsRepository(private val api: SmartiflyApi) : SearchSuggestionsDataSource, HomeAnalyticsDataSource {
    private val blockedUntilMs = mutableMapOf<String, Long>()
    private val serverErrorCooldownMs = 90_000L

    private fun isCoolingDown(key: String): Boolean {
        val now = System.currentTimeMillis()
        return (blockedUntilMs[key] ?: 0L) > now
    }

    private fun startCooldown(key: String) {
        blockedUntilMs[key] = System.currentTimeMillis() + serverErrorCooldownMs
    }

    private fun Any?.asStringList(): List<String> =
        (this as? List<*>)?.mapNotNull { it as? String } ?: emptyList()

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

    suspend fun trackPlayback(movieId: String, type: String, profileId: String, status: String) {
        try {
            val event = mapOf(
                "movieId" to movieId,
                "type" to type,
                "profileId" to profileId,
                "status" to status
            )
            api.trackPlayback(event)
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyAnalytics", "Playback tracking network issue: ${e.message}")
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyAnalytics", "Playback tracking HTTP ${e.code()}")
        } catch (e: IllegalStateException) {
            android.util.Log.e("SmartiflyAnalytics", "Playback tracking parse/state error: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to track playback: ${e.message}")
        }
    }

    override suspend fun getTrendingIds(): List<String> {
        val key = "trending"
        if (isCoolingDown(key)) return emptyList()
        return try {
            val response = api.getTrendingIds()
            response["data"].asStringList()
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyAnalytics", "Trending network issue: ${e.message}")
            emptyList()
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyAnalytics", "Trending HTTP ${e.code()}")
            if (e.code() >= 500) startCooldown(key)
            emptyList()
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to fetch trending: ${e.message}")
            emptyList()
        }
    }

    override suspend fun getSearchSuggestions(): List<String> {
        val key = "suggestions"
        if (isCoolingDown(key)) return emptyList()
        return try {
            val response = api.getSearchSuggestions()
            response["data"].asStringList()
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyAnalytics", "Suggestions network issue: ${e.message}")
            emptyList()
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyAnalytics", "Suggestions HTTP ${e.code()}")
            if (e.code() >= 500) startCooldown(key)
            emptyList()
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to fetch suggestions: ${e.message}")
            emptyList()
        }
    }

    override suspend fun getSmartRows(profileId: String): List<Pair<String, List<com.smartifly.tv.data.models.MovieMetadata>>> {
        val key = "smart_rows:$profileId"
        if (isCoolingDown(key)) return emptyList()
        return try {
            val response = api.getSmartRows(profileId)
            val rows = response["rows"].asMapList()
            rows.map { row ->
                val title = row["title"] as? String ?: "Smart Row"
                val items = row["items"].asMapList().map { item ->
                    com.smartifly.tv.data.models.MovieMetadata(
                        id = (item["contentId"] ?: item["id"]).toString(),
                        title = item["title"] as? String ?: "Unknown",
                        description = item["overview"] as? String ?: "",
                        posterUrl = item["posterPath"] as? String ?: "",
                        backdropUrl = item["backdropPath"] as? String ?: "",
                        rating = (item["rating"] ?: "0.0").toString(),
                        year = item["releaseDate"] as? String ?: "",
                        duration = "N/A",
                        type = "movie"
                    )
                }
                title to items
            }
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyAnalytics", "Smart rows network issue: ${e.message}")
            emptyList()
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyAnalytics", "Smart rows HTTP ${e.code()}")
            if (e.code() >= 500) startCooldown(key)
            emptyList()
        } catch (e: IllegalStateException) {
            android.util.Log.e("SmartiflyAnalytics", "Smart rows parse/state error: ${e.message}")
            emptyList()
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to fetch smart rows: ${e.message}")
            emptyList()
        }
    }
}
