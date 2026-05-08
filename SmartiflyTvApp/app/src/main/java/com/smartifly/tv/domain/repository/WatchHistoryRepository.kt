package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.WatchHistoryEntry
import kotlinx.coroutines.flow.Flow

interface WatchHistoryRepository {
    val historyFlow: Flow<List<WatchHistoryEntry>>

    suspend fun upsert(entry: WatchHistoryEntry)
    suspend fun getEntry(id: String): WatchHistoryEntry?
    suspend fun remove(id: String)
    suspend fun clear()
}
