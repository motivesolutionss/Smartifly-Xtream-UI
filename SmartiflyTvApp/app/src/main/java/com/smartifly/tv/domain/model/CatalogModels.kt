package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

enum class CatalogType {
    MOVIE,
    SERIES,
    LIVE,
}

@Serializable
data class CatalogItem(
    val id: String,
    val sourceId: Int,
    val title: String,
    val imageUrl: String,
    val categoryId: String,
    val categoryName: String = "",
    val type: String,
    val rating: Double? = null,
    val description: String = "",
    val contentRating: String? = null,
)

@Serializable
data class HomeRail(
    val id: String,
    val title: String,
    val items: List<CatalogItem>,
)

@Serializable
data class HomeCatalogData(
    val hero: CatalogItem?,
    val rails: List<HomeRail>,
    val allItems: List<CatalogItem>,
)

@Serializable
data class HomeCatalogCacheEntry(
    val sessionKey: String,
    val data: HomeCatalogData,
    val savedAt: Long = System.currentTimeMillis(),
)

@Serializable
data class FavoriteItem(
    val id: String,
    val title: String,
    val imageUrl: String,
    val type: String,
    val savedAt: Long = System.currentTimeMillis(),
)
