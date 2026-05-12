package com.smartifly.tv.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.smartifly.tv.data.local.dao.CategoryDao
import com.smartifly.tv.data.local.dao.StreamDao
import com.smartifly.tv.data.local.dao.AccountDao
import com.smartifly.tv.data.local.entities.CategoryEntity
import com.smartifly.tv.data.local.entities.StreamEntity
import com.smartifly.tv.data.local.entities.AccountEntity

/**
 * Enterprise-grade Smartifly TV Database.
 * Central authority for all persistent IPTV data and metadata.
 */
@Database(
    entities = [
        CategoryEntity::class,
        StreamEntity::class,
        AccountEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class SmartiflyDatabase : RoomDatabase() {

    abstract fun categoryDao(): CategoryDao
    abstract fun streamDao(): StreamDao
    abstract fun accountDao(): AccountDao

    companion object {
        @Volatile
        private var INSTANCE: SmartiflyDatabase? = null

        fun getInstance(context: Context): SmartiflyDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SmartiflyDatabase::class.java,
                    "smartifly_tv_db"
                )
                .fallbackToDestructiveMigration() // Handle schema changes professionally during development
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
