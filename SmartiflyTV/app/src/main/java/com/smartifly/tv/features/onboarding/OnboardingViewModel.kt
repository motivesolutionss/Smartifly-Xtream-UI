package com.smartifly.tv.features.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.onboarding.DeviceActivationInfo
import com.smartifly.tv.data.onboarding.DeviceStatus
import com.smartifly.tv.data.onboarding.OnboardingRepository
import com.smartifly.tv.data.onboarding.XtreamCredentials
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class OnboardingUiState {
    object Welcome : OnboardingUiState()
    object ExistingLogin : OnboardingUiState()
    data class NewRegistration(val info: DeviceActivationInfo) : OnboardingUiState()
    object Loading : OnboardingUiState()
    object Success : OnboardingUiState()
    data class Error(val message: String) : OnboardingUiState()
}

class OnboardingViewModel(private val repository: OnboardingRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<OnboardingUiState>(OnboardingUiState.Welcome)
    val uiState: StateFlow<OnboardingUiState> = _uiState

    fun showExistingLogin() {
        _uiState.value = OnboardingUiState.ExistingLogin
    }

    fun startNewCustomerFlow() {
        viewModelScope.launch {
            _uiState.value = OnboardingUiState.Loading
            try {
                val info = repository.registerDevice()
                _uiState.value = OnboardingUiState.NewRegistration(info)
                startPolling(info.deviceId)
            } catch (e: Exception) {
                _uiState.value = OnboardingUiState.Error("Failed to register device")
            }
        }
    }

    private fun startPolling(deviceId: String) {
        viewModelScope.launch {
            repository.pollStatus(deviceId).collect { status ->
                if (status == DeviceStatus.ACTIVATED) {
                    _uiState.value = OnboardingUiState.Success
                }
            }
        }
    }

    fun loginWithXtream(portal: String, user: String, pass: String) {
        viewModelScope.launch {
            _uiState.value = OnboardingUiState.Loading
            val success = repository.loginWithXtream(XtreamCredentials(portal, user, pass))
            if (success) {
                _uiState.value = OnboardingUiState.Success
            } else {
                _uiState.value = OnboardingUiState.Error("Invalid credentials or portal URL")
            }
        }
    }

    fun goBack() {
        _uiState.value = OnboardingUiState.Welcome
    }
}
