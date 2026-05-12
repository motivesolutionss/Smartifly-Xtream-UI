package com.smartifly.tv.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.smartifly.tv.data.onboarding.XtreamCredentials
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.MutableStateFlow

data class UserProfile(
    val id: String,
    val name: String,
    val iconUrl: String? = null
)

class SessionManager(private val context: Context) {
    
    // In a professional app, this would be backed by DataStore or a Profile Repository
    private val _currentProfile = MutableStateFlow(UserProfile("default", "Primary User"))
    val profileFlow: Flow<UserProfile?> = _currentProfile

    companion object {
        private val KEY_ACTIVATED = booleanPreferencesKey("device_activated")
        private val KEY_XTREAM_SERVER = stringPreferencesKey("xtream_server")
        private val KEY_XTREAM_USER = stringPreferencesKey("xtream_user")
        private val KEY_XTREAM_PASS = stringPreferencesKey("xtream_pass")
        private val KEY_XTREAM_OPERATOR_ID = stringPreferencesKey("xtream_operator_id")
        private val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
    }

    val isActivated: Flow<Boolean> = context.dataStore.data.map { it[KEY_ACTIVATED] ?: false }
    
    val xtreamCredentialsFlow: Flow<XtreamCredentials?> = context.dataStore.data.map { preferences ->
        val url = preferences[KEY_XTREAM_SERVER] ?: return@map null
        val user = preferences[KEY_XTREAM_USER] ?: return@map null
        val pass = preferences[KEY_XTREAM_PASS] ?: return@map null
        XtreamCredentials(
            baseUrl = url,
            username = user,
            password = pass,
            operatorId = preferences[KEY_XTREAM_OPERATOR_ID] ?: ""
        )
    }

    suspend fun getXtreamCredentials(): XtreamCredentials? = xtreamCredentialsFlow.firstOrNull()

    val deviceId: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_ID] }

    suspend fun saveActivation(credentials: XtreamCredentials) {
        context.dataStore.edit { preferences ->
            preferences[KEY_ACTIVATED] = true
            preferences[KEY_XTREAM_SERVER] = credentials.baseUrl.trim().removeSuffix("/")
            preferences[KEY_XTREAM_USER] = credentials.username.trim()
            preferences[KEY_XTREAM_PASS] = credentials.password
            preferences[KEY_XTREAM_OPERATOR_ID] = credentials.operatorId.trim().uppercase()
        }
    }

    suspend fun setDeviceId(id: String) {
        context.dataStore.edit { it[KEY_DEVICE_ID] = id }
    }

    suspend fun setBoundUserId(userId: String) {
        context.dataStore.edit { it[KEY_USER_ID] = userId }
    }

    suspend fun getBoundUserId(): String? {
        return context.dataStore.data.map { it[KEY_USER_ID] }.firstOrNull()
    }

    suspend fun logout() {
        context.dataStore.edit { preferences ->
            preferences[KEY_ACTIVATED] = false
            preferences.remove(KEY_XTREAM_SERVER)
            preferences.remove(KEY_XTREAM_USER)
            preferences.remove(KEY_XTREAM_PASS)
            preferences.remove(KEY_XTREAM_OPERATOR_ID)
            preferences.remove(KEY_USER_ID)
        }
    }
}
