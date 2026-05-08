package com.smartifly.tv.data.repository

import com.smartifly.tv.core.config.AppConfig
import com.smartifly.tv.data.remote.AppUpdateDto
import com.smartifly.tv.data.remote.BackendApiService
import com.smartifly.tv.data.remote.BootCheckRequestDto
import com.smartifly.tv.data.remote.BootCheckResponseDto
import com.smartifly.tv.data.remote.DeviceCheckRequestDto
import com.smartifly.tv.data.remote.DeviceCheckResponseDto
import com.smartifly.tv.data.remote.MasterApiService
import com.smartifly.tv.data.remote.ReportLoginRequestDto
import com.smartifly.tv.domain.model.BootAccessState
import com.smartifly.tv.domain.provider.DeviceProvider
import com.smartifly.tv.domain.repository.MasterControlRepository
import retrofit2.HttpException

class DefaultMasterControlRepository(
    private val masterApi: MasterApiService,
    private val backendApi: BackendApiService,
    private val deviceProvider: DeviceProvider,
) : MasterControlRepository {
    private var lastResponse: com.smartifly.tv.data.remote.BootCheckResponseDto? = null
    private companion object {
        val allowedStatuses = setOf("OK", "ALLOWED", "ACTIVE")
        val nonRetryableStatuses = setOf("BANNED", "BLOCKED", "EXPIRED", "INVALID", "CAP_REACHED")
    }

    override suspend fun verifyStartupAccess(): BootAccessState {
        val hardwareId = deviceProvider.getDeviceId()
        val apiKey = AppConfig.MASTER_API_KEY

        val deviceCheck = runCatching {
            masterApi.deviceCheck(
                apiKey = apiKey,
                hardwareId = hardwareId,
                request = DeviceCheckRequestDto(
                    hardwareId = hardwareId,
                    deviceModel = deviceProvider.getDeviceModel(),
                    osVersion = deviceProvider.getOsVersion(),
                )
            )
        }.fold(
            onSuccess = { it },
            onFailure = { error ->
                if (error is HttpException) {
                    return error.toBootAccessState(defaultStatus = "BANNED")
                }
                return BootAccessState(isChecking = false, isAllowed = true, status = "OK")
            }
        )

        val deviceAccess = deviceCheck.toBootAccessState()
        if (!deviceAccess.isAllowed) {
            return deviceAccess
        }

        return runCatching {
            masterApi.bootCheck(
                apiKey = apiKey,
                hardwareId = hardwareId,
                request = BootCheckRequestDto(
                    licenseKey = "SFLY-0162-70A9-A568",
                    hardwareId = hardwareId,
                    deviceName = deviceProvider.getDeviceName(),
                    deviceModel = deviceProvider.getDeviceModel(),
                    osVersion = deviceProvider.getOsVersion(),
                    appVersion = deviceProvider.getAppVersionName(),
                    security = com.smartifly.tv.data.remote.SecurityPayloadDto(
                        isRooted = deviceProvider.isRooted(),
                        isEmulator = deviceProvider.isEmulator(),
                        isDebuggerConnected = deviceProvider.isDebuggerConnected(),
                        isHooked = false // Hook detection requires native libs not yet included
                    )
                )
            )
        }.fold(
            onSuccess = { response ->
                lastResponse = response
                response.toBootAccessState()
            },
            onFailure = { error ->
                if (error is HttpException) {
                    error.toBootAccessState(defaultStatus = "BLOCKED")
                } else {
                    BootAccessState(isChecking = false, isAllowed = true, status = "OK")
                }
            }
        )
    }

    override suspend fun reportLogin(serverUrl: String, username: String, password: String) {
        runCatching {
            val hardwareId = deviceProvider.getDeviceId()
            masterApi.reportLogin(
                apiKey = AppConfig.MASTER_API_KEY,
                hardwareId = hardwareId,
                request = ReportLoginRequestDto(
                    licenseKey = "SFLY-0162-70A9-A568",
                    hardwareId = hardwareId,
                    serverUrl = serverUrl,
                    username = username,
                    password = password,
                )
            )
        }
    }

    override suspend fun getRemoteAnnouncements(): List<com.smartifly.tv.data.remote.MasterBroadcastDto> {
        return lastResponse?.broadcasts ?: emptyList()
    }

    override suspend fun checkAppUpdate(): com.smartifly.tv.data.remote.UpdateResponseDto? {
        return runCatching {
            val appUpdate = backendApi.checkUpdate(
                name = "Smartifly TV",
                version = deviceProvider.getAppVersionName(),
                platform = "tv"
            )
            
            if (appUpdate.success && appUpdate.version != null) {
                com.smartifly.tv.data.remote.UpdateResponseDto(
                    versionName = appUpdate.version,
                    updateUrl = appUpdate.url,
                    isMandatory = appUpdate.isMandatory,
                    releaseNotes = appUpdate.notes
                )
            } else null
        }.getOrNull()
    }

    private fun DeviceCheckResponseDto.toBootAccessState(): BootAccessState {
        val normalizedStatus = normalizeStatus(status)
        return buildAccessState(
            status = normalizedStatus,
            message = message,
            client = null,
            defaultBlockedMessage = when (normalizedStatus) {
                "BANNED" -> "This device is blocked from Smartifly."
                "BLOCKED" -> "This device is not allowed to access Smartifly."
                "EXPIRED" -> "Your Smartifly access has expired."
                "MAINTENANCE" -> "Smartifly is under maintenance. Please try again shortly."
                else -> "Access to Smartifly is currently restricted."
            },
        )
    }

    private fun BootCheckResponseDto.toBootAccessState(): BootAccessState {
        val normalizedStatus = normalizeStatus(status)
        return buildAccessState(
            status = normalizedStatus,
            message = message,
            client = client,
            defaultBlockedMessage = when (normalizedStatus) {
                "BANNED" -> "This device is blocked from Smartifly."
                "BLOCKED" -> "Access to Smartifly TV is currently blocked."
                "EXPIRED" -> "Your Smartifly subscription has expired."
                "MAINTENANCE" -> "Smartifly TV is under maintenance. Please try again shortly."
                "CAP_REACHED" -> "Your account has reached its allowed device limit."
                "INVALID" -> "Your Smartifly access is invalid."
                else -> "Access to Smartifly TV is currently restricted."
            },
        )
    }

    private fun HttpException.toBootAccessState(defaultStatus: String): BootAccessState {
        val payload = response()?.errorBody()?.string().orEmpty()
        val normalizedStatus = normalizeStatus(extractStatus(payload) ?: defaultStatus)
        val extractedMessage = extractMessage(payload)
        return buildAccessState(
            status = normalizedStatus,
            message = extractedMessage ?: message(),
            client = null,
            defaultBlockedMessage = when (normalizedStatus) {
                "BANNED" -> "This device is blocked from Smartifly."
                "BLOCKED" -> "Access to Smartifly TV is currently blocked."
                "EXPIRED" -> "Your Smartifly subscription has expired."
                "MAINTENANCE" -> "Smartifly TV is under maintenance. Please try again shortly."
                "CAP_REACHED" -> "Your account has reached its allowed device limit."
                "INVALID" -> "Your Smartifly access is invalid."
                else -> "Access to Smartifly TV is currently restricted."
            },
        )
    }

    private fun buildAccessState(
        status: String,
        message: String?,
        client: String?,
        defaultBlockedMessage: String,
    ): BootAccessState {
        val normalizedStatus = normalizeStatus(status)
        val isAllowed = normalizedStatus in allowedStatuses
        return BootAccessState(
            isChecking = false,
            isAllowed = isAllowed,
            status = normalizedStatus,
            message = if (isAllowed) message else message?.takeIf { it.isNotBlank() } ?: defaultBlockedMessage,
            client = client,
            retryAllowed = normalizedStatus !in nonRetryableStatuses,
        )
    }

    private fun normalizeStatus(rawStatus: String?): String {
        val normalized = rawStatus
            ?.trim()
            ?.replace('-', '_')
            ?.replace(' ', '_')
            ?.uppercase()
            .orEmpty()
        return when {
            normalized.isBlank() -> "OK"
            normalized in allowedStatuses -> "OK"
            normalized.contains("BANNED") -> "BANNED"
            normalized.contains("BLOCK") -> "BLOCKED"
            normalized.contains("EXPIRE") -> "EXPIRED"
            normalized.contains("MAINT") -> "MAINTENANCE"
            normalized.contains("CAP") -> "CAP_REACHED"
            normalized.contains("INVALID") || normalized.contains("REVOKED") -> "INVALID"
            else -> normalized
        }
    }

    private fun extractStatus(payload: String): String? {
        val knownStatuses = listOf("BLOCKED", "EXPIRED", "INVALID", "CAP_REACHED", "BANNED", "MAINTENANCE", "ALLOWED", "OK", "ACTIVE")
        return knownStatuses.firstOrNull { payload.contains(it, ignoreCase = true) }
    }

    private fun extractMessage(payload: String): String? {
        val match = Regex("\"message\"\\s*:\\s*\"([^\"]+)\"").find(payload)
        return match?.groupValues?.getOrNull(1)
    }
}
