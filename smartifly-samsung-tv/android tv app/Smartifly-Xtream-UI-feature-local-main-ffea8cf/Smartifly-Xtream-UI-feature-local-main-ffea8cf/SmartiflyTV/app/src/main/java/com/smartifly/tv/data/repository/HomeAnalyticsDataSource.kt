package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata

interface HomeAnalyticsDataSource {
    suspend fun getTrendingIds(): List<String>
    suspend fun getSmartRows(profileId: String): List<Pair<String, List<MovieMetadata>>>
}
