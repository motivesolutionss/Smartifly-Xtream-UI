package com.smartifly.tv.data

import kotlinx.coroutines.flow.Flow

interface ResumeWatchingDataSource {
    fun getAllWatchProgress(profileId: String): Flow<List<WatchProgress>>
}
