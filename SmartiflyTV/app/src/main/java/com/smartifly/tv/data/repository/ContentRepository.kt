package com.smartifly.tv.data.repository

import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.data.remote.dto.HomeResponse

class ContentRepository(private val api: SmartiflyApi) {

    suspend fun getHomeData(): HomeResponse {
        return api.getHomeData()
    }

    suspend fun getMovies(category: String? = null): List<MovieMetadata> {
        return api.getMovies(category).map { it.toDomain() }
    }

    suspend fun getSeries(category: String? = null): List<MovieMetadata> {
        return api.getSeries(category).map { it.toDomain() }
    }

    suspend fun search(query: String): List<MovieMetadata> {
        return api.search(query).map { it.toDomain() }
    }
}
