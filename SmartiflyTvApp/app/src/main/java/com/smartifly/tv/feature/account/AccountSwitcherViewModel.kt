package com.smartifly.tv.feature.account

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.SavedAccount
import com.smartifly.tv.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AccountSwitcherState(
    val savedAccounts: List<SavedAccount> = emptyList(),
    val portals: List<Portal> = emptyList(),
    val selectedAccountId: String? = null,
    val selectedPortalId: String? = null,
    val isApplying: Boolean = false,
    val errorMessage: String? = null,
) {
    val selectedAccount: SavedAccount?
        get() = savedAccounts.firstOrNull { it.id == selectedAccountId }

    val selectedPortal: Portal?
        get() = portals.firstOrNull { it.id == selectedPortalId }
}

class AccountSwitcherViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AccountSwitcherState())
    val state: StateFlow<AccountSwitcherState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            combine(
                authRepository.sessionFlow,
                authRepository.savedAccountsFlow,
                authRepository.cachedPortalsFlow,
                authRepository.selectedPortalIdFlow
            ) { session, savedAccounts, portals, selectedPortalId ->
                val currentAccountId = session?.toSavedAccountId()
                AccountSwitcherState(
                    savedAccounts = savedAccounts.sortedByDescending { it.lastActive },
                    portals = portals,
                    selectedAccountId = currentAccountId,
                    selectedPortalId = selectedPortalId ?: portals.firstOrNull()?.id
                )
            }.collect { latest ->
                _state.update {
                    it.copy(
                        savedAccounts = latest.savedAccounts,
                        portals = latest.portals,
                        selectedAccountId = it.selectedAccountId?.takeIf { id ->
                            latest.savedAccounts.any { account -> account.id == id }
                        } ?: latest.selectedAccountId,
                        selectedPortalId = it.selectedPortalId?.takeIf { id ->
                            latest.portals.any { portal -> portal.id == id }
                        } ?: latest.selectedPortalId,
                    )
                }
            }
        }

        viewModelScope.launch {
            authRepository.fetchPortals(forceRefresh = true)
        }
    }

    fun selectPortal(portalId: String) {
        viewModelScope.launch {
            authRepository.setSelectedPortal(portalId)
            _state.update { it.copy(selectedPortalId = portalId, selectedAccountId = null, errorMessage = null) }
        }
    }

    fun selectSavedAccount(accountId: String) {
        val account = _state.value.savedAccounts.firstOrNull { it.id == accountId } ?: return
        viewModelScope.launch {
            authRepository.setSelectedPortal(account.portal.id)
            _state.update {
                it.copy(
                    selectedAccountId = accountId,
                    selectedPortalId = account.portal.id,
                    errorMessage = null,
                )
            }
        }
    }

    fun applySelection(onApplied: () -> Unit) {
        val snapshot = _state.value
        if (snapshot.selectedAccountId == null && snapshot.selectedPortalId == null) {
            _state.update { it.copy(errorMessage = "Select an account or server first.") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isApplying = true, errorMessage = null) }
            runCatching {
                val selectedAccountId = snapshot.selectedAccountId
                if (selectedAccountId != null) {
                    authRepository.switchAccount(selectedAccountId).getOrThrow()
                } else {
                    val selectedPortalId = snapshot.selectedPortalId ?: error("Select a server first.")
                    authRepository.setSelectedPortal(selectedPortalId)
                    authRepository.logout()
                }
            }.onSuccess {
                _state.update { it.copy(isApplying = false) }
                onApplied()
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        isApplying = false,
                        errorMessage = error.message ?: "Failed to switch account."
                    )
                }
            }
        }
    }

    fun removeSelectedAccount() {
        val selectedAccountId = _state.value.selectedAccountId ?: return
        viewModelScope.launch {
            runCatching {
                authRepository.removeAccount(selectedAccountId)
            }.onFailure { error ->
                _state.update { it.copy(errorMessage = error.message ?: "Failed to remove saved account.") }
            }
        }
    }

    companion object {
        fun factory(
            authRepository: AuthRepository,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return AccountSwitcherViewModel(authRepository) as T
            }
        }
    }
}

private fun AuthSession.toSavedAccountId(): String = "${portalId}_${username}"
