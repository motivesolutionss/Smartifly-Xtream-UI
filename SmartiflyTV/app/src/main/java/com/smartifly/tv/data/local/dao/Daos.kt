package com.smartifly.tv.data.local.dao

import androidx.room.*
import com.smartifly.tv.data.local.entities.CategoryEntity
import com.smartifly.tv.data.local.entities.StreamEntity
import com.smartifly.tv.data.local.entities.AccountEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories WHERE type = :type")
    fun getCategoriesByType(type: String): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories WHERE type = :type")
    suspend fun clearCategoriesByType(type: String)
}

@Dao
interface StreamDao {
    @Query("SELECT * FROM streams WHERE categoryId = :categoryId")
    fun getStreamsByCategory(categoryId: String): Flow<List<StreamEntity>>

    @Query("SELECT * FROM streams WHERE isFavorite = 1")
    fun getFavorites(): Flow<List<StreamEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStreams(streams: List<StreamEntity>)

    @Update
    suspend fun updateStream(stream: StreamEntity)

    @Query("UPDATE streams SET isFavorite = :isFavorite WHERE streamId = :streamId")
    suspend fun setFavorite(streamId: Int, isFavorite: Boolean)

    @Query("DELETE FROM streams WHERE categoryId = :categoryId")
    suspend fun clearStreamsByCategory(categoryId: String)
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
