package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.SmartiflyApi

class AnalyticsRepository(private val api: SmartiflyApi) {
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
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to track playback: ${e.message}")
        }
    }

    suspend fun getTrendingIds(): List<String> {
        return try {
            val response = api.getTrendingIds()
            response["data"].asStringList()
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to fetch trending: ${e.message}")
            emptyList()
        }
    }

    suspend fun getSearchSuggestions(): List<String> {
        return try {
            val response = api.getSearchSuggestions()
            response["data"].asStringList()
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to fetch suggestions: ${e.message}")
            emptyList()
        }
    }

    suspend fun getSmartRows(profileId: String): List<Pair<String, List<com.smartifly.tv.data.models.MovieMetadata>>> {
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
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyAnalytics", "Failed to fetch smart rows: ${e.message}")
            emptyList()
        }
    }
}
