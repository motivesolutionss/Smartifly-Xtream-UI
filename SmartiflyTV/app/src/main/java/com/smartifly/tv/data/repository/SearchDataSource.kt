package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata

interface SearchDataSource {
    suspend fun search(query: String): List<MovieMetadata>
    fun clearCache()
}
