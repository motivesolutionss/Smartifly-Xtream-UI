package com.smartifly.tv.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.BootAccessState
import com.smartifly.tv.domain.model.ProfileSet
import com.smartifly.tv.domain.repository.AuthRepository
import com.smartifly.tv.domain.repository.MasterControlRepository
import com.smartifly.tv.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class AppPhase {
    BOOTING,
    BLOCKED,
    LOGIN,
    PROFILE_SWITCHER,
    HOME,
}

data class AppState(
    val phase: AppPhase = AppPhase.BOOTING,
    val session: AuthSession? = null,
    val profileSet: ProfileSet = ProfileSet(),
    val bootAccess: BootAccessState = BootAccessState(),
)

class AppViewModel(
    private val authRepository: AuthRepository,
    private val profileRepository: ProfileRepository,
    private val masterControlRepository: MasterControlRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()
    private val bootAccessState = MutableStateFlow(BootAccessState())

    init {
        verifyStartupAccess()
        viewModelScope.launch {
            combine(
                authRepository.sessionFlow,
                profileRepository.profileSetFlow,
                bootAccessState,
            ) { session, profileSet, bootAccess ->
                val phase = when {
                    bootAccess.isChecking -> AppPhase.BOOTING
                    !bootAccess.isAllowed -> AppPhase.BLOCKED
                    session == null -> AppPhase.LOGIN
                    profileSet.profiles.isEmpty() || profileSet.activeProfileId == null -> AppPhase.PROFILE_SWITCHER
                    else -> AppPhase.HOME
                }
                AppState(
                    phase = phase,
                    session = session,
                    profileSet = profileSet,
                    bootAccess = bootAccess,
                )
            }.collect { latest -> _state.update { latest } }
        }
    }

    private fun verifyStartupAccess() {
        viewModelScope.launch {
            bootAccessState.value = BootAccessState(isChecking = true)
            bootAccessState.value = masterControlRepository.verifyStartupAccess()
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }

    fun openProfileSwitcher() {
        viewModelScope.launch {
            profileRepository.clearActiveProfile()
        }
    }

    fun retryStartupAccess() {
        verifyStartupAccess()
    }

    companion object {
        fun factory(
            authRepository: AuthRepository,
            profileRepository: ProfileRepository,
            masterControlRepository: MasterControlRepository,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return AppViewModel(authRepository, profileRepository, masterControlRepository) as T
            }
        }
    }
}
