package com.smartifly.tv.data.local.dao

import androidx.room.*
import com.smartifly.tv.data.local.entities.CategoryEntity
import com.smartifly.tv.data.local.entities.StreamEntity
import com.smartifly.tv.data.local.entities.AccountEntity
import com.smartifly.tv.data.local.entities.SyncStateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories WHERE providerKey = :providerKey AND type = :type")
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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStreams(streams: List<StreamEntity>)

    @Update
    suspend fun updateStream(stream: StreamEntity)

    @Query("UPDATE streams SET isFavorite = :isFavorite WHERE providerKey = :providerKey AND streamType = :streamType AND streamId = :streamId")
    suspend fun setFavorite(providerKey: String, streamType: String, streamId: Int, isFavorite: Boolean)

    @Query("DELETE FROM streams WHERE providerKey = :providerKey AND streamType = :streamType AND categoryId = :categoryId")
    suspend fun clearStreamsByCategory(providerKey: String, streamType: String, categoryId: String)
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
