package com.smartifly.tv.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Enterprise-grade Category Entity.
 * Persists Live, VOD, and Series categories for instant UI loading.
 */
@Entity(
    tableName = "categories",
    primaryKeys = ["providerKey", "type", "categoryId"],
    indices = [
        Index(value = ["providerKey", "type"]),
        Index(value = ["providerKey", "type", "categoryName"])
    ]
)
data class CategoryEntity(
    val providerKey: String,
    val categoryId: String,
    val categoryName: String,
    val parentId: String = "0",
    val type: String // "LIVE", "VOD", "SERIES"
)

/**
 * Enterprise-grade Stream Entity.
 * Persists metadata for channels, movies, and series.
 */
@Entity(
    tableName = "streams",
    primaryKeys = ["providerKey", "streamType", "streamId"],
    indices = [
        Index(value = ["providerKey", "streamType", "categoryId"]),
        Index(value = ["providerKey", "isFavorite"])
    ]
)
data class StreamEntity(
    val providerKey: String,
    val streamId: Int,
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

@Entity(
    tableName = "sync_state",
    primaryKeys = ["providerKey", "domain", "type", "categoryId"],
    indices = [
        Index(value = ["providerKey", "domain", "type"]),
        Index(value = ["providerKey", "lastSuccessAtMs"])
    ]
)
data class SyncStateEntity(
    val providerKey: String,
    val domain: String, // "CATEGORY" | "STREAM"
    val type: String, // LIVE | VOD | SERIES
    val categoryId: String, // "__ALL__" for category domain
    val lastAttemptAtMs: Long,
    val lastSuccessAtMs: Long,
    val itemCount: Int,
    val lastError: String? = null
)
