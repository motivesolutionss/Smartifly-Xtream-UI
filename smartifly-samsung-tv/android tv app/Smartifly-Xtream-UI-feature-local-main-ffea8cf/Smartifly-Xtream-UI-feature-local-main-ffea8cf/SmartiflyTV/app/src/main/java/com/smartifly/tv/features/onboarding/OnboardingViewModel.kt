package com.smartifly.tv.features.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.onboarding.OnboardingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

sealed class OnboardingUiState {
    object Welcome : OnboardingUiState()
    object ExistingLogin : OnboardingUiState()
    object NewRegistration : OnboardingUiState()
    object Success : OnboardingUiState()
}

class OnboardingViewModel(private val repository: OnboardingRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<OnboardingUiState>(OnboardingUiState.Welcome)
    val uiState: StateFlow<OnboardingUiState> = _uiState

    fun showExistingLogin() {
        _uiState.value = OnboardingUiState.ExistingLogin
    }

    fun startNewCustomerFlow() {
        // Just switch state, LoginViewModel will handle the session fetching
        _uiState.value = OnboardingUiState.NewRegistration
    }

    fun goBack() {
        _uiState.value = OnboardingUiState.Welcome
    }
}
