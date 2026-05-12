package com.smartifly.tv.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.smartifly.tv.ui.theme.ThemeMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsManager(private val context: Context) {
    private val THEME_KEY = stringPreferencesKey("theme_mode")
    private val PARENTAL_PIN_KEY = stringPreferencesKey("parental_pin")
    private val LANGUAGE_KEY = stringPreferencesKey("language")
    private val LOW_END_MODE_KEY = stringPreferencesKey("low_end_mode")

    val themeMode: Flow<ThemeMode> = context.dataStore.data.map { preferences ->
        val themeName = preferences[THEME_KEY] ?: ThemeMode.Metallic.name
        try {
            ThemeMode.valueOf(themeName)
        } catch (e: Exception) {
            ThemeMode.Metallic
        }
    }

    val parentalPin: Flow<String?> = context.dataStore.data.map { it[PARENTAL_PIN_KEY] }
    val language: Flow<String> = context.dataStore.data.map { it[LANGUAGE_KEY] ?: "en" }
    val lowEndMode: Flow<Boolean> = context.dataStore.data.map { it[LOW_END_MODE_KEY]?.toBoolean() ?: false }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { it[THEME_KEY] = mode.name }
    }

    suspend fun setParentalPin(pin: String) {
        context.dataStore.edit { it[PARENTAL_PIN_KEY] = pin }
    }

    suspend fun setLanguage(lang: String) {
        context.dataStore.edit { it[LANGUAGE_KEY] = lang }
    }

    suspend fun setLowEndMode(enabled: Boolean) {
        context.dataStore.edit { it[LOW_END_MODE_KEY] = enabled.toString() }
    }
}
