package com.smartifly.tv.data.repository

import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import kotlinx.coroutines.flow.first

/**
 * Enterprise-grade Repository for Global Search.
 * 
 * Orchestrates cross-content discovery by aggregating results from 
 * Movies and Series. Optimized for local filtering to ensure 
 * lightning-fast results on Android TV.
 */
class SearchRepository(private val xtreamRepository: XtreamRepository) : SearchDataSource {
    
    private var movieCache: List<MovieMetadata>? = null
    private var seriesCache: List<MovieMetadata>? = null
    private var cachePortalKey: String? = null

    override suspend fun search(query: String): List<MovieMetadata> {
        if (query.isEmpty()) return emptyList()
        val currentPortalKey = xtreamRepository.getPortalCapabilityKey()
        if (cachePortalKey != currentPortalKey) {
            clearCache()
            cachePortalKey = currentPortalKey
        }
        
        val allMovies = getCachedMovies()
        val allSeries = getCachedSeries()
        
        val normalizedQuery = query.lowercase()
        
        val movieResults = allMovies.filter { it.title.lowercase().contains(normalizedQuery) }
        val seriesResults = allSeries.filter { it.title.lowercase().contains(normalizedQuery) }
        
        return (movieResults + seriesResults).sortedByDescending { it.year }
    }

    private suspend fun getCachedMovies(): List<MovieMetadata> {
        if (movieCache != null) return movieCache!!
        
        val result = xtreamRepository.getMovies().first { it !is NetworkResult.Loading }
        if (result is NetworkResult.Success<*>) {
            @Suppress("UNCHECKED_CAST")
            movieCache = (result.data as List<com.smartifly.tv.data.remote.models.XtreamMovie>).map { it.toDomain() }
        }
        return movieCache ?: emptyList()
    }

    private suspend fun getCachedSeries(): List<MovieMetadata> {
        if (seriesCache != null) return seriesCache!!
        
        val result = xtreamRepository.getSeries().first { it !is NetworkResult.Loading }
        if (result is NetworkResult.Success<*>) {
            @Suppress("UNCHECKED_CAST")
            seriesCache = (result.data as List<com.smartifly.tv.data.remote.models.XtreamSeries>).map { it.toDomain() }
        }
        return seriesCache ?: emptyList()
    }
    
    override fun clearCache() {
        movieCache = null
        seriesCache = null
        cachePortalKey = null
    }
}
