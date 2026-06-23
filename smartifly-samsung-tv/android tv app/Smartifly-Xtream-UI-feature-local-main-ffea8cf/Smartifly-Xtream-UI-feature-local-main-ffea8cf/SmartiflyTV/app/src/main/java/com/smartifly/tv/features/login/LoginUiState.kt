package com.smartifly.tv.features.login

enum class LoginStep {
    Welcome, Identity, Credentials, Registration
}

data class LoginUiState(
    val step: LoginStep = LoginStep.Welcome,
    val deviceId: String = "SF-${java.util.UUID.randomUUID().toString().take(8).uppercase()}",
    val isActivated: Boolean = false,
    val portalCode: String = "",
    val serverName: String? = null,
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isServerValidated: Boolean = false,
    // Backend-driven session data
    val activationUrl: String = "https://xtreamui.duckdns.org/register",
    val activationCode: String = "",
    val qrData: String? = null
)
