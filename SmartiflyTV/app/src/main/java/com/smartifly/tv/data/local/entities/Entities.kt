package com.smartifly.tv.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Enterprise-grade Category Entity.
 * Persists Live, VOD, and Series categories for instant UI loading.
 */
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val categoryId: String,
    val categoryName: String,
    val parentId: String = "0",
    val type: String // "LIVE", "VOD", "SERIES"
)

/**
 * Enterprise-grade Stream Entity.
 * Persists metadata for channels, movies, and series.
 */
@Entity(tableName = "streams")
data class StreamEntity(
    @PrimaryKey val streamId: Int,
    val name: String,
    val streamType: String, // "live", "movie", "series"
    val categoryId: String,
    val streamIcon: String? = null,
    val rating: String? = null,
    val added: String? = null,
    val isFavorite: Boolean = false,
    val lastWatched: Long = 0
)

/**
 * Enterprise-grade Account Entity.
 * Caches active Xtream account metadata for high-fidelity session sync.
 */
@Entity(tableName = "account_metadata")
data class AccountEntity(
    @PrimaryKey val username: String,
    val status: String,
    val expiryDate: String?,
    val trial: String?,
    val activeConnections: String?,
    val maxConnections: String?,
    val lastUpdated: Long = System.currentTimeMillis()
)
