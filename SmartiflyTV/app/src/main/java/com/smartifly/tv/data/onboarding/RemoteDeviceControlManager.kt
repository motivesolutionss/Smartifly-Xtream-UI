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
                    val remoteStatusResult = repository.checkActivationStatusDetailed(deviceId)
                    handleRemoteStatus(remoteStatusResult.status)
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
            }
            DeviceStatus.EXPIRED -> {
                stateManager.clearSession()
            }
            DeviceStatus.ACTIVATED -> {
                stateManager.updateStatus(DeviceStatus.ACTIVATED)
            }
            else -> {
                // Enterprise Enhancement: Do NOT downgrade an ACTIVATED device to PENDING 
                // due to network jitters or transient repository errors.
                // We only allow downgrades if it's an explicit BLOCKED or EXPIRED state.
            }
        }
    }

    fun stopMonitoring() {
        pollingJob?.cancel()
    }
}
