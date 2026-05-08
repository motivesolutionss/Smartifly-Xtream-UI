package com.smartifly.tv.data.repository

import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.SmartiflyApi

class SearchRepository(private val api: SmartiflyApi) {
    suspend fun search(query: String): List<MovieMetadata> {
        return api.search(query).map { it.toDomain() }
    }
}
