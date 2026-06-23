package com.smartifly.tv.data.local.dao

import androidx.room.*
import com.smartifly.tv.data.local.entities.CategoryEntity
import com.smartifly.tv.data.local.entities.StreamEntity
import com.smartifly.tv.data.local.entities.AccountEntity
import com.smartifly.tv.data.local.entities.SyncStateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories WHERE providerKey = :providerKey AND type = :type ORDER BY categoryName COLLATE NOCASE, categoryId")
    fun getCategoriesByType(providerKey: String, type: String): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE providerKey = :providerKey AND type = :type")
    suspend fun clearCategoriesByType(providerKey: String, type: String)
}

@Dao
interface StreamDao {
    @Query("SELECT * FROM streams WHERE providerKey = :providerKey AND streamType = :streamType AND categoryId = :categoryId")
    fun getStreamsByCategory(providerKey: String, streamType: String, categoryId: String): Flow<List<StreamEntity>>

    @Query("SELECT * FROM streams WHERE providerKey = :providerKey AND isFavorite = 1")
    fun getFavorites(providerKey: String): Flow<List<StreamEntity>>

    @Query("SELECT * FROM streams WHERE providerKey = :providerKey AND streamType = :streamType AND isFavorite = 1")
    fun getFavoritesByType(providerKey: String, streamType: String): Flow<List<StreamEntity>>

    @Query("SELECT streamId FROM streams WHERE providerKey = :providerKey AND streamType = :streamType AND isFavorite = 1")
    suspend fun getFavoriteStreamIdsByType(providerKey: String, streamType: String): List<Int>

    @Query("SELECT EXISTS(SELECT 1 FROM streams WHERE providerKey = :providerKey AND streamType = :streamType AND streamId = :streamId AND isFavorite = 1)")
    suspend fun isFavorite(providerKey: String, streamType: String, streamId: Int): Boolean

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStreams(streams: List<StreamEntity>)

    @Update
    suspend fun updateStream(stream: StreamEntity)

    @Query("UPDATE streams SET isFavorite = :isFavorite WHERE providerKey = :providerKey AND streamType = :streamType AND streamId = :streamId")
    suspend fun setFavorite(providerKey: String, streamType: String, streamId: Int, isFavorite: Boolean)

    @Query("DELETE FROM streams WHERE providerKey = :providerKey AND streamType = :streamType AND categoryId = :categoryId")
    suspend fun clearStreamsByCategory(providerKey: String, streamType: String, categoryId: String)

    @Query("DELETE FROM streams WHERE providerKey = :providerKey AND streamType = :streamType")
    suspend fun clearStreamsByType(providerKey: String, streamType: String)

    @Query(
        """
        SELECT * FROM streams
        WHERE providerKey = :providerKey
          AND (
            lower(name) LIKE :containsQuery ESCAPE '\'
            OR replace(replace(replace(replace(lower(name), ' ', ''), '-', ''), '.', ''), '_', '') LIKE :compactContainsQuery ESCAPE '\'
          )
        ORDER BY
          CASE
            WHEN lower(name) = :exactQuery THEN 0
            WHEN replace(replace(replace(replace(lower(name), ' ', ''), '-', ''), '.', ''), '_', '') = :compactExactQuery THEN 1
            WHEN lower(name) LIKE :prefixQuery ESCAPE '\' THEN 2
            WHEN replace(replace(replace(replace(lower(name), ' ', ''), '-', ''), '.', ''), '_', '') LIKE :compactPrefixQuery ESCAPE '\' THEN 3
            ELSE 4
          END,
          CASE streamType
            WHEN 'live' THEN 0
            WHEN 'movie' THEN 1
            ELSE 2
          END,
          isFavorite DESC,
          lastWatched DESC,
          name COLLATE NOCASE
        LIMIT :limit
        """
    )
    suspend fun searchStreams(
        providerKey: String,
        exactQuery: String,
        prefixQuery: String,
        containsQuery: String,
        compactExactQuery: String,
        compactPrefixQuery: String,
        compactContainsQuery: String,
        limit: Int
    ): List<StreamEntity>

    @Query(
        """
        SELECT * FROM streams
        WHERE providerKey = :providerKey AND streamType = :streamType
        ORDER BY RANDOM()
        LIMIT :limit
        """
    )
    suspend fun getRandomStreamsByType(
        providerKey: String,
        streamType: String,
        limit: Int
    ): List<StreamEntity>
}

@Dao
interface AccountDao {
    @Query("SELECT * FROM account_metadata LIMIT 1")
    fun getAccountMetadata(): Flow<AccountEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveAccountMetadata(account: AccountEntity)

    @Query("DELETE FROM account_metadata")
    suspend fun clearAccount()
}

@Dao
interface SyncStateDao {
    @Query("SELECT * FROM sync_state WHERE providerKey = :providerKey AND domain = :domain AND type = :type AND categoryId = :categoryId LIMIT 1")
    suspend fun getState(providerKey: String, domain: String, type: String, categoryId: String): SyncStateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(state: SyncStateEntity)
}
