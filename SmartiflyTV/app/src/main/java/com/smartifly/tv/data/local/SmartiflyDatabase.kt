package com.smartifly.tv.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.smartifly.tv.data.local.dao.CategoryDao
import com.smartifly.tv.data.local.dao.StreamDao
import com.smartifly.tv.data.local.dao.AccountDao
import com.smartifly.tv.data.local.dao.SyncStateDao
import com.smartifly.tv.data.local.entities.CategoryEntity
import com.smartifly.tv.data.local.entities.StreamEntity
import com.smartifly.tv.data.local.entities.AccountEntity
import com.smartifly.tv.data.local.entities.SyncStateEntity

/**
 * Enterprise-grade Smartifly TV Database.
 * Central authority for all persistent IPTV data and metadata.
 */
@Database(
    entities = [
        CategoryEntity::class,
        StreamEntity::class,
        AccountEntity::class,
        SyncStateEntity::class
    ],
    version = 3,
    exportSchema = true
)
abstract class SmartiflyDatabase : RoomDatabase() {

    abstract fun categoryDao(): CategoryDao
    abstract fun streamDao(): StreamDao
    abstract fun accountDao(): AccountDao
    abstract fun syncStateDao(): SyncStateDao

    companion object {
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS categories_new (
                        providerKey TEXT NOT NULL,
                        categoryId TEXT NOT NULL,
                        categoryName TEXT NOT NULL,
                        parentId TEXT NOT NULL,
                        type TEXT NOT NULL,
                        PRIMARY KEY(providerKey, type, categoryId)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO categories_new(providerKey, categoryId, categoryName, parentId, type)
                    SELECT 'legacy', categoryId, categoryName, parentId, type FROM categories
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE categories")
                db.execSQL("ALTER TABLE categories_new RENAME TO categories")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_categories_providerKey_type ON categories(providerKey, type)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_categories_providerKey_type_categoryName ON categories(providerKey, type, categoryName)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS streams_new (
                        providerKey TEXT NOT NULL,
                        streamId INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        streamType TEXT NOT NULL,
                        categoryId TEXT NOT NULL,
                        streamIcon TEXT,
                        rating TEXT,
                        added TEXT,
                        isFavorite INTEGER NOT NULL,
                        lastWatched INTEGER NOT NULL,
                        PRIMARY KEY(providerKey, streamType, streamId)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO streams_new(providerKey, streamId, name, streamType, categoryId, streamIcon, rating, added, isFavorite, lastWatched)
                    SELECT 'legacy', streamId, name, streamType, categoryId, streamIcon, rating, added, isFavorite, lastWatched FROM streams
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE streams")
                db.execSQL("ALTER TABLE streams_new RENAME TO streams")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_streams_providerKey_streamType_categoryId ON streams(providerKey, streamType, categoryId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_streams_providerKey_isFavorite ON streams(providerKey, isFavorite)")
            }
        }
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS sync_state (
                        providerKey TEXT NOT NULL,
                        domain TEXT NOT NULL,
                        type TEXT NOT NULL,
                        categoryId TEXT NOT NULL,
                        lastAttemptAtMs INTEGER NOT NULL,
                        lastSuccessAtMs INTEGER NOT NULL,
                        itemCount INTEGER NOT NULL,
                        lastError TEXT,
                        PRIMARY KEY(providerKey, domain, type, categoryId)
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_state_providerKey_domain_type ON sync_state(providerKey, domain, type)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_state_providerKey_lastSuccessAtMs ON sync_state(providerKey, lastSuccessAtMs)")
            }
        }

        @Volatile
        private var INSTANCE: SmartiflyDatabase? = null

        fun getInstance(context: Context): SmartiflyDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SmartiflyDatabase::class.java,
                    "smartifly_tv_db"
                )
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
