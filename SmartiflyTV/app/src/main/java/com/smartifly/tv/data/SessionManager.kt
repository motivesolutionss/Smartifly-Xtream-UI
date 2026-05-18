package com.smartifly.tv.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.smartifly.tv.data.hero.HeroImageResolver
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

        private const val VAULT_PREF = "secure_session_vault"
        private const val VAULT_SERVER = "secure_xtream_server"
        private const val VAULT_USER = "secure_xtream_user"
        private const val VAULT_PASS = "secure_xtream_pass"
        private const val VAULT_OPERATOR = "secure_xtream_operator"
    }

    private val credentialVault by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            VAULT_PREF,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    val isActivated: Flow<Boolean> = context.dataStore.data.map { it[KEY_ACTIVATED] ?: false }
    
    val xtreamCredentialsFlow: Flow<XtreamCredentials?> = context.dataStore.data.map { preferences ->
        val vaultUrl = credentialVault.getString(VAULT_SERVER, null)
        val vaultUser = credentialVault.getString(VAULT_USER, null)
        val vaultPass = credentialVault.getString(VAULT_PASS, null)
        val vaultOperator = credentialVault.getString(VAULT_OPERATOR, null)

        val url = vaultUrl ?: preferences[KEY_XTREAM_SERVER] ?: return@map null
        val user = vaultUser ?: preferences[KEY_XTREAM_USER] ?: return@map null
        val pass = vaultPass ?: preferences[KEY_XTREAM_PASS] ?: return@map null
        XtreamCredentials(
            baseUrl = url,
            username = user,
            password = pass,
            operatorId = vaultOperator ?: preferences[KEY_XTREAM_OPERATOR_ID] ?: ""
        )
    }

    suspend fun getXtreamCredentials(): XtreamCredentials? {
        val creds = xtreamCredentialsFlow.firstOrNull()
        HeroImageResolver.setPortalBaseUrl(creds?.baseUrl)
        return creds
    }

    val deviceId: Flow<String?> = context.dataStore.data.map { it[KEY_DEVICE_ID] }

    suspend fun saveActivation(credentials: XtreamCredentials) {
        HeroImageResolver.setPortalBaseUrl(credentials.baseUrl)
        credentialVault.edit()
            .putString(VAULT_SERVER, credentials.baseUrl.trim().removeSuffix("/"))
            .putString(VAULT_USER, credentials.username.trim())
            .putString(VAULT_PASS, credentials.password)
            .putString(VAULT_OPERATOR, credentials.operatorId.trim().uppercase())
            .apply()

        context.dataStore.edit { preferences ->
            preferences[KEY_ACTIVATED] = true
            // Kept for backward compatibility; values are removed below on next save cycle.
            preferences[KEY_XTREAM_SERVER] = ""
            preferences[KEY_XTREAM_USER] = ""
            preferences[KEY_XTREAM_PASS] = ""
            preferences[KEY_XTREAM_OPERATOR_ID] = ""
        }
        clearLegacyCredentialKeys()
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
        HeroImageResolver.setPortalBaseUrl(null)
        credentialVault.edit()
            .remove(VAULT_SERVER)
            .remove(VAULT_USER)
            .remove(VAULT_PASS)
            .remove(VAULT_OPERATOR)
            .apply()
        context.dataStore.edit { preferences ->
            preferences[KEY_ACTIVATED] = false
            preferences.remove(KEY_XTREAM_SERVER)
            preferences.remove(KEY_XTREAM_USER)
            preferences.remove(KEY_XTREAM_PASS)
            preferences.remove(KEY_XTREAM_OPERATOR_ID)
            preferences.remove(KEY_USER_ID)
        }
    }

    private suspend fun clearLegacyCredentialKeys() {
        context.dataStore.edit { preferences ->
            preferences.remove(KEY_XTREAM_SERVER)
            preferences.remove(KEY_XTREAM_USER)
            preferences.remove(KEY_XTREAM_PASS)
            preferences.remove(KEY_XTREAM_OPERATOR_ID)
        }
    }
}
