package com.smartifly.tv.data.repository

import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.domain.model.TvAppSettings
import com.smartifly.tv.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class DefaultSettingsRepository(
    private val preferences: AppPreferencesDataSource,
) : SettingsRepository {
    override val settingsFlow: Flow<TvAppSettings> = preferences.appSettingsFlow

    override suspend fun updateSettings(transform: (TvAppSettings) -> TvAppSettings) {
        val current = settingsFlow.first()
        preferences.saveAppSettings(transform(current))
    }
}

