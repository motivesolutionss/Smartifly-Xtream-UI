package com.smartifly.tv.data.onboarding

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

class RemoteDeviceControlManager(
    private val repository: OnboardingRepository,
    private val stateManager: ActivationStateManager,
    private val scope: CoroutineScope
) {
    private var pollingJob: Job? = null

    fun startRemoteMonitoring(deviceId: String) {
        pollingJob?.cancel()
        pollingJob = scope.launch {
            while (isActive) {
                try {
                    val remoteStatus = repository.checkActivationStatus(deviceId)
                    handleRemoteStatus(remoteStatus)
                } catch (e: Exception) {
                    // Log error but keep polling
                }
                delay(30000) // Poll every 30 seconds for remote commands
            }
        }
    }

    private suspend fun handleRemoteStatus(status: DeviceStatus) {
        when (status) {
            DeviceStatus.BLOCKED -> {
                stateManager.updateStatus(DeviceStatus.BLOCKED)
                // App will reactively show Blocked screen
            }
            DeviceStatus.EXPIRED -> {
                stateManager.clearSession()
                // App will return to onboarding
            }
            else -> {
                stateManager.updateStatus(status)
            }
        }
    }

    fun stopMonitoring() {
        pollingJob?.cancel()
    }
}
