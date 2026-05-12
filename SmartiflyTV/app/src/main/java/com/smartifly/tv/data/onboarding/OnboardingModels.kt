package com.smartifly.tv.data.onboarding

enum class DeviceStatus {
    PENDING, CONTACTED, ACTIVATED, EXPIRED, BLOCKED
}

data class DeviceActivationSession(
    val success: Boolean,
    val qrCode: String?,
    val webLink: String,
    val token: String,
    val settingsCode: String,
    val expiresIn: String? = null
)

data class DeviceActivationInfo(
    val deviceId: String,
    val activationCode: String,
    val qrToken: String,
    val status: DeviceStatus,
    val websiteUrl: String = "smartifly.tv/activate"
)

data class XtreamCredentials(
    val baseUrl: String,
    val username: String,
    val password: String,
    val operatorId: String = ""
)

data class PortalDetails(
    val portalCode: String,
    val baseUrl: String,
    val name: String = ""
)

sealed class DeviceRegistrationResult {
    data object Success : DeviceRegistrationResult()
    data class Error(val message: String, val retryable: Boolean = true) : DeviceRegistrationResult()
}

sealed class ActivationSessionResult {
    data class Success(val session: DeviceActivationSession) : ActivationSessionResult()
    data class Error(val message: String, val retryable: Boolean = true) : ActivationSessionResult()
}

sealed class PortalValidationResult {
    data class Success(val portal: PortalDetails) : PortalValidationResult()
    data class Error(val message: String, val retryable: Boolean = true) : PortalValidationResult()
}

sealed class XtreamLoginResult {
    data object Success : XtreamLoginResult()
    data class Error(val message: String, val retryable: Boolean = true) : XtreamLoginResult()
}

enum class ActivationStatusSource {
    REMOTE,
    LOCAL_FALLBACK
}

data class ActivationStatusResult(
    val status: DeviceStatus,
    val reason: String,
    val source: ActivationStatusSource
)
