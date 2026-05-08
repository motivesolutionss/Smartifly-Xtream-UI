package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.TvAppSettings
import kotlinx.coroutines.flow.Flow

interface SettingsRepository {
    val settingsFlow: Flow<TvAppSettings>
    suspend fun updateSettings(transform: (TvAppSettings) -> TvAppSettings)
}

