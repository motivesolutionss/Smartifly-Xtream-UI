package com.smartifly.tv.data.onboarding

enum class DeviceStatus {
    PENDING, CONTACTED, ACTIVATED, EXPIRED, BLOCKED
}

data class DeviceActivationInfo(
    val deviceId: String,
    val activationCode: String,
    val qrToken: String,
    val status: DeviceStatus,
    val websiteUrl: String = "smartifly.tv/activate"
)

data class XtreamCredentials(
    val portalUrl: String,
    val username: String,
    val password: String,
    val operatorId: String = ""
)
