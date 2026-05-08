package com.smartifly.tv.data.repository

import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.FavoriteItem
import com.smartifly.tv.domain.repository.FavoritesRepository
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map

@OptIn(ExperimentalCoroutinesApi::class)
class DefaultFavoritesRepository(
    private val preferences: AppPreferencesDataSource,
    private val profileRepository: ProfileRepository,
) : FavoritesRepository {

    private val activeProfileIdFlow: Flow<String?> = profileRepository.profileSetFlow
        .map { it.activeProfileId }

    override val favoritesFlow: Flow<List<FavoriteItem>> = activeProfileIdFlow
        .flatMapLatest { profileId ->
            if (profileId == null) flowOf(emptyList())
            else preferences.favoritesFlow(profileId)
        }

    override suspend fun toggleFavorite(item: CatalogItem): Boolean {
        val profileId = activeProfileIdFlow.first() ?: return false
        val current = favoritesFlow.first().toMutableList()
        val existingIndex = current.indexOfFirst { it.id == item.id }

        return if (existingIndex >= 0) {
            current.removeAt(existingIndex)
            preferences.saveFavorites(profileId, current)
            false
        } else {
            current.add(
                FavoriteItem(
                    id = item.id,
                    title = item.title,
                    imageUrl = item.imageUrl,
                    type = item.type,
                )
            )
            preferences.saveFavorites(profileId, current)
            true
        }
    }

    override suspend fun removeFavorite(id: String) {
        val profileId = activeProfileIdFlow.first() ?: return
        val current = favoritesFlow.first().filterNot { it.id == id }
        preferences.saveFavorites(profileId, current)
    }

    override suspend fun clearAll() {
        val profileId = activeProfileIdFlow.first() ?: return
        preferences.saveFavorites(profileId, emptyList())
    }

    override suspend fun isFavorite(id: String): Boolean {
        return favoritesFlow.first().any { it.id == id }
    }
}
