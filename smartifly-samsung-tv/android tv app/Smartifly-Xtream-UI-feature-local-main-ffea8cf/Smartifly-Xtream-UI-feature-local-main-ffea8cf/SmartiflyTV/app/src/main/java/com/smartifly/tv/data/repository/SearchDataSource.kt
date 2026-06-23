package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.SearchDiscoveryRow

interface SearchDataSource {
    suspend fun search(query: String): List<MovieMetadata>
    suspend fun warmSearchCatalog()
    suspend fun getIdleDiscoveryRows(): List<SearchDiscoveryRow>
    fun clearCache()
}
