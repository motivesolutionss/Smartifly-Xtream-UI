package com.smartifly.tv.data.repository

import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.domain.model.WatchHistoryEntry
import com.smartifly.tv.domain.repository.ProfileRepository
import com.smartifly.tv.domain.repository.WatchHistoryRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map

@OptIn(ExperimentalCoroutinesApi::class)
class DefaultWatchHistoryRepository(
    private val preferences: AppPreferencesDataSource,
    private val profileRepository: ProfileRepository,
) : WatchHistoryRepository {

    private val activeProfileIdFlow: Flow<String?> = profileRepository.profileSetFlow
        .map { it.activeProfileId }

    override val historyFlow: Flow<List<WatchHistoryEntry>> = activeProfileIdFlow
        .flatMapLatest { profileId ->
            if (profileId == null) flowOf(emptyList())
            else preferences.watchHistoryFlow(profileId)
        }

    override suspend fun upsert(entry: WatchHistoryEntry) {
        val profileId = activeProfileIdFlow.first() ?: return

        if (entry.isCompleted) {
            remove(entry.id)
            return
        }

        val current = historyFlow.first()
        val updated = listOf(entry.copy(lastUpdated = System.currentTimeMillis())) +
            current.filterNot { it.id == entry.id }
        preferences.saveWatchHistory(profileId, updated.take(30))
    }

    override suspend fun getEntry(id: String): WatchHistoryEntry? {
        return historyFlow.first().firstOrNull { it.id == id }
    }

    override suspend fun remove(id: String) {
        val profileId = activeProfileIdFlow.first() ?: return
        preferences.saveWatchHistory(profileId, historyFlow.first().filterNot { it.id == id })
    }

    override suspend fun clear() {
        val profileId = activeProfileIdFlow.first() ?: return
        preferences.saveWatchHistory(profileId, emptyList())
    }
}
