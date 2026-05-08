package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.FavoriteItem
import kotlinx.coroutines.flow.Flow

interface FavoritesRepository {
    val favoritesFlow: Flow<List<FavoriteItem>>

    suspend fun toggleFavorite(item: CatalogItem): Boolean
    suspend fun removeFavorite(id: String)
    suspend fun clearAll()
    suspend fun isFavorite(id: String): Boolean
}
