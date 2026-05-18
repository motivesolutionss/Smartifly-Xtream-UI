package com.smartifly.tv.data.hero

import com.smartifly.tv.data.models.MovieMetadata

interface HomeHeroEnricher {
    suspend fun enrich(base: MovieMetadata, timeoutMs: Long = 3500L): MovieMetadata?
}
