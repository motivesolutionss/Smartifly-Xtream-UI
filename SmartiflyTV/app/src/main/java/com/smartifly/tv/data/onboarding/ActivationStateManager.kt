package com.smartifly.tv.data.onboarding

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.onboardingDataStore: DataStore<Preferences> by preferencesDataStore(name = "onboarding_prefs")

class ActivationStateManager(private val context: Context) {
    
    private val DEVICE_ID = stringPreferencesKey("device_id")
    private val STATUS = stringPreferencesKey("activation_status")
    private val OPERATOR_ID = stringPreferencesKey("operator_id")
    private val ASSIGNED_USER = stringPreferencesKey("assigned_user")
    private val LAST_SYNC = longPreferencesKey("last_sync_at")

    val activationStatus: Flow<DeviceStatus> = context.onboardingDataStore.data.map { prefs ->
        val statusStr = prefs[STATUS] ?: DeviceStatus.PENDING.name
        DeviceStatus.valueOf(statusStr)
    }

    val deviceMetadata: Flow<Map<String, String>> = context.onboardingDataStore.data.map { prefs ->
        mapOf(
            "deviceId" to (prefs[DEVICE_ID] ?: ""),
            "operatorId" to (prefs[OPERATOR_ID] ?: ""),
            "assignedUser" to (prefs[ASSIGNED_USER] ?: "")
        )
    }

    suspend fun saveActivation(info: DeviceActivationInfo, status: DeviceStatus) {
        context.onboardingDataStore.edit { prefs ->
            prefs[DEVICE_ID] = info.deviceId
            prefs[STATUS] = status.name
            prefs[LAST_SYNC] = System.currentTimeMillis()
        }
    }

    suspend fun updateStatus(status: DeviceStatus) {
        context.onboardingDataStore.edit { prefs ->
            prefs[STATUS] = status.name
            prefs[LAST_SYNC] = System.currentTimeMillis()
        }
    }

    suspend fun clearSession() {
        context.onboardingDataStore.edit { it.clear() }
    }
}
