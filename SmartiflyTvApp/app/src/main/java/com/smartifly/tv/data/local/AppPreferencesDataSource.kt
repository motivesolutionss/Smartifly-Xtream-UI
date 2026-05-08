package com.smartifly.tv.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.FavoriteItem
import com.smartifly.tv.domain.model.HomeCatalogCacheEntry
import com.smartifly.tv.domain.model.HomeCatalogData
import com.smartifly.tv.domain.model.ProfileSet
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.SavedAccount
import com.smartifly.tv.domain.model.TvAppSettings
import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.WatchHistoryEntry
import kotlinx.serialization.decodeFromString
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AppPreferencesDataSource(
    context: Context,
    private val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    },
) {
    private val dataStore = context.tvDataStore

    private val sessionKey = stringPreferencesKey("auth_session")
    private val portalsKey = stringPreferencesKey("cached_portals")
    private val selectedPortalIdKey = stringPreferencesKey("selected_portal_id")
    private val savedAccountsKey = stringPreferencesKey("saved_accounts")
    private val profilesKey = stringPreferencesKey("profiles")
    private val favoritesKey = stringPreferencesKey("favorites")
    private val watchHistoryKey = stringPreferencesKey("watch_history")
    private val appSettingsKey = stringPreferencesKey("app_settings")
    private val downloadsKey = stringPreferencesKey("downloads")
    private val homeCatalogCacheKey = stringPreferencesKey("home_catalog_cache")
    private val homeHeroChoiceKey = stringPreferencesKey("home_hero_choice")
    private val readAnnouncementsKey = stringPreferencesKey("read_announcements")

    val sessionFlow: Flow<AuthSession?> = dataStore.data.map { prefs ->
        prefs[sessionKey]?.let { raw ->
            runCatching { json.decodeFromString<AuthSession>(raw) }.getOrNull()
        }
    }

    val portalsFlow: Flow<List<Portal>> = dataStore.data.map { prefs ->
        prefs[portalsKey]?.let { raw ->
            runCatching { json.decodeFromString<List<Portal>>(raw) }.getOrDefault(emptyList())
        } ?: emptyList()
    }

    val selectedPortalIdFlow: Flow<String?> = dataStore.data.map { prefs ->
        prefs[selectedPortalIdKey]
    }

    val savedAccountsFlow: Flow<List<SavedAccount>> = dataStore.data.map { prefs ->
        prefs[savedAccountsKey]?.let { raw ->
            runCatching { json.decodeFromString<List<SavedAccount>>(raw) }.getOrDefault(emptyList())
        } ?: emptyList()
    }

    val readAnnouncementsFlow: Flow<Set<String>> = dataStore.data.map { prefs ->
        prefs[readAnnouncementsKey]?.let { raw ->
            runCatching { json.decodeFromString<Set<String>>(raw) }.getOrDefault(emptySet())
        } ?: emptySet()
    }

    val profileSetFlow: Flow<ProfileSet> = dataStore.data.map { prefs ->
        prefs[profilesKey]?.let { raw ->
            runCatching { json.decodeFromString<ProfileSet>(raw) }.getOrNull()
        } ?: ProfileSet()
    }

    fun favoritesFlow(profileId: String): Flow<List<FavoriteItem>> = dataStore.data.map { prefs ->
        val key = stringPreferencesKey("favorites_$profileId")
        prefs[key]?.let { raw ->
            runCatching { json.decodeFromString<List<FavoriteItem>>(raw) }.getOrDefault(emptyList())
        } ?: emptyList()
    }

    fun watchHistoryFlow(profileId: String): Flow<List<WatchHistoryEntry>> = dataStore.data.map { prefs ->
        val key = stringPreferencesKey("watch_history_$profileId")
        prefs[key]?.let { raw ->
            runCatching { json.decodeFromString<List<WatchHistoryEntry>>(raw) }.getOrDefault(emptyList())
        } ?: emptyList()
    }

    val appSettingsFlow: Flow<TvAppSettings> = dataStore.data.map { prefs ->
        prefs[appSettingsKey]?.let { raw ->
            runCatching { json.decodeFromString<TvAppSettings>(raw) }.getOrNull()
        } ?: TvAppSettings()
    }

    val downloadsFlow: Flow<List<TvDownloadItem>> = dataStore.data.map { prefs ->
        prefs[downloadsKey]?.let { raw ->
            runCatching { json.decodeFromString<List<TvDownloadItem>>(raw) }.getOrDefault(emptyList())
        } ?: emptyList()
    }

    suspend fun saveSession(session: AuthSession) {
        dataStore.edit { prefs ->
            prefs[sessionKey] = json.encodeToString(session)
        }
    }

    suspend fun clearSession() {
        dataStore.edit { prefs ->
            prefs.remove(sessionKey)
        }
    }

    suspend fun savePortals(portals: List<Portal>) {
        dataStore.edit { prefs ->
            prefs[portalsKey] = json.encodeToString(portals)
        }
    }

    suspend fun saveSelectedPortalId(portalId: String) {
        dataStore.edit { prefs ->
            prefs[selectedPortalIdKey] = portalId
        }
    }

    suspend fun saveSavedAccounts(accounts: List<SavedAccount>) {
        dataStore.edit { prefs ->
            prefs[savedAccountsKey] = json.encodeToString(accounts)
        }
    }

    suspend fun saveProfileSet(profileSet: ProfileSet) {
        dataStore.edit { prefs ->
            prefs[profilesKey] = json.encodeToString(profileSet)
        }
    }

    suspend fun saveFavorites(profileId: String, items: List<FavoriteItem>) {
        dataStore.edit { prefs ->
            val key = stringPreferencesKey("favorites_$profileId")
            prefs[key] = json.encodeToString(items)
        }
    }

    suspend fun saveWatchHistory(profileId: String, items: List<WatchHistoryEntry>) {
        dataStore.edit { prefs ->
            val key = stringPreferencesKey("watch_history_$profileId")
            prefs[key] = json.encodeToString(items)
        }
    }

    suspend fun saveAppSettings(settings: TvAppSettings) {
        dataStore.edit { prefs ->
            prefs[appSettingsKey] = json.encodeToString(settings)
        }
    }

    suspend fun saveDownloads(items: List<TvDownloadItem>) {
        dataStore.edit { prefs ->
            prefs[downloadsKey] = json.encodeToString(items)
        }
    }

    suspend fun saveHomeCatalogCache(
        sessionKey: String,
        data: HomeCatalogData,
    ) {
        dataStore.edit { prefs ->
            prefs[homeCatalogCacheKey] = json.encodeToString(
                HomeCatalogCacheEntry(
                    sessionKey = sessionKey,
                    data = data,
                )
            )
        }
    }

    suspend fun getHomeCatalogCache(sessionKey: String): HomeCatalogData? {
        val raw = dataStore.data.first()[homeCatalogCacheKey] ?: return null
        val entry = runCatching {
            json.decodeFromString<HomeCatalogCacheEntry>(raw)
        }.getOrNull() ?: return null
        return entry.data.takeIf { entry.sessionKey == sessionKey }
    }

    suspend fun saveLastHomeHero(sessionKey: String, heroId: String) {
        dataStore.edit { prefs ->
            prefs[homeHeroChoiceKey] = "$sessionKey::$heroId"
        }
    }

    suspend fun getLastHomeHero(sessionKey: String): String? {
        val value = dataStore.data.first()[homeHeroChoiceKey] ?: return null
        val parts = value.split("::", limit = 2)
        if (parts.size != 2) return null
        return parts[1].takeIf { parts[0] == sessionKey }
    }

    suspend fun markAnnouncementAsRead(id: String) {
        dataStore.edit { prefs ->
            val current = prefs[readAnnouncementsKey]?.let { raw ->
                runCatching { json.decodeFromString<Set<String>>(raw) }.getOrDefault(emptySet())
            } ?: emptySet()
            prefs[readAnnouncementsKey] = json.encodeToString(current + id)
        }
    }
}
