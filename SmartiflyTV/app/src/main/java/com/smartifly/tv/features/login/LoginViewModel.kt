package com.smartifly.tv.features.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.onboarding.ActivationSessionResult
import com.smartifly.tv.data.onboarding.OnboardingRepository
import com.smartifly.tv.data.onboarding.PortalValidationResult
import com.smartifly.tv.data.onboarding.DeviceStatus
import com.smartifly.tv.data.onboarding.XtreamCredentials
import com.smartifly.tv.data.onboarding.XtreamLoginResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

class LoginViewModel(private val repository: OnboardingRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState

    init {
        // In a real app, you would load a persisted deviceId
    }

    fun navigateTo(step: LoginStep) {
        _uiState.value = _uiState.value.copy(step = step, error = null)
    }

    fun startActivationPolling(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            // Step 1: Fetch fresh session from backend (Godfather style)
            when (val sessionResult = repository.fetchActivationSession(_uiState.value.deviceId)) {
                is ActivationSessionResult.Success -> {
                    val session = sessionResult.session
                    _uiState.value = _uiState.value.copy(
                        activationUrl = session.webLink,
                        activationCode = session.settingsCode,
                        qrData = session.qrCode,
                        isLoading = false,
                        error = null
                    )
                }
                is ActivationSessionResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = sessionResult.message
                    )
                    return@launch
                }
            }

            // Step 2: Start polling for status changes
            repository.pollStatusDetailed(_uiState.value.deviceId).collect { statusResult ->
                if (statusResult.status == DeviceStatus.ACTIVATED) {
                    _uiState.value = _uiState.value.copy(isActivated = true)
                    onSuccess()
                } else if (statusResult.status == DeviceStatus.BLOCKED || statusResult.status == DeviceStatus.EXPIRED) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = statusResult.reason
                    )
                }
            }
        }
    }

    fun onUsernameChanged(name: String) {
        _uiState.value = _uiState.value.copy(username = name, error = null)
    }

    fun onPasswordChanged(pass: String) {
        _uiState.value = _uiState.value.copy(password = pass, error = null)
    }

    fun onIdentityNext() {
        val code = _uiState.value.portalCode
        if (code.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Server Identity is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            when (val portalResult = repository.validatePortalCode(code)) {
                is PortalValidationResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isServerValidated = true,
                        step = LoginStep.Credentials,
                        serverName = portalResult.portal.name,
                        // Prevent credential carry-over when switching identities.
                        username = "",
                        password = "",
                        error = null
                    )
                }
                is PortalValidationResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = portalResult.message
                    )
                }
            }
        }
    }

    fun performLogin(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.username.isBlank() || state.password.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "All fields are required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            // Step 1: Get Portal Details (already validated, but we need the URL)
            val portal = when (val portalResult = repository.validatePortalCode(state.portalCode)) {
                is PortalValidationResult.Success -> portalResult.portal
                is PortalValidationResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = portalResult.message
                    )
                    return@launch
                }
            }

            // Step 2: Xtream Authentication with resolved Base URL
            val loginResult = repository.loginWithXtream(
                XtreamCredentials(
                    baseUrl = portal.baseUrl,
                    username = state.username,
                    password = state.password,
                    operatorId = portal.portalCode
                )
            )

            when (loginResult) {
                is XtreamLoginResult.Success -> {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = null)
                    onSuccess()
                }
                is XtreamLoginResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = loginResult.message
                    )
                }
            }
        }
    }

    fun onPortalKeyClick(key: String) {
        val current = _uiState.value.portalCode
        if (current.length < 20) {
            _uiState.value = _uiState.value.copy(portalCode = current + key, error = null)
        }
    }

    fun onPortalBackspace() {
        val current = _uiState.value.portalCode
        if (current.isNotEmpty()) {
            _uiState.value = _uiState.value.copy(portalCode = current.dropLast(1), error = null)
        }
    }

    fun onCredentialKeyClick(key: String, targetField: String) {
        when (targetField) {
            "USERNAME" -> {
                val current = _uiState.value.username
                if (current.length < 32) {
                    _uiState.value = _uiState.value.copy(username = current + key, error = null)
                }
            }
            "PASSWORD" -> {
                val current = _uiState.value.password
                if (current.length < 32) {
                    _uiState.value = _uiState.value.copy(password = current + key, error = null)
                }
            }
        }
    }

    fun onCredentialBackspace(targetField: String) {
        when (targetField) {
            "USERNAME" -> {
                val current = _uiState.value.username
                if (current.isNotEmpty()) {
                    _uiState.value = _uiState.value.copy(username = current.dropLast(1), error = null)
                }
            }
            "PASSWORD" -> {
                val current = _uiState.value.password
                if (current.isNotEmpty()) {
                    _uiState.value = _uiState.value.copy(password = current.dropLast(1), error = null)
                }
            }
        }
    }

    fun goBackToIdentity() {
        _uiState.value = _uiState.value.copy(
            step = LoginStep.Identity,
            isServerValidated = false,
            error = null
        )
    }
}
