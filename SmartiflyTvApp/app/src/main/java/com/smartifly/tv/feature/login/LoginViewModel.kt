package com.smartifly.tv.feature.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.model.AuthTimeoutException
import com.smartifly.tv.domain.model.InvalidCredentialsAuthException
import com.smartifly.tv.domain.model.MalformedXtreamResponseAuthException
import com.smartifly.tv.domain.model.NoPortalSelectedAuthException
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.PortalHealth
import com.smartifly.tv.domain.model.PortalHealthStatus
import com.smartifly.tv.domain.model.ServiceUnavailableAuthException
import com.smartifly.tv.domain.repository.AuthRepository
import com.smartifly.tv.domain.repository.ProfileRepository
import com.smartifly.tv.domain.provider.DeviceProvider
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LoginViewModel(
    private val authRepository: AuthRepository,
    private val profileRepository: ProfileRepository,
    private val deviceProvider: DeviceProvider,
) : ViewModel() {
    private val _state = MutableStateFlow(LoginState(isLoadingPortals = true))
    val state: StateFlow<LoginState> = _state.asStateFlow()

    init {
        refreshPortals()
    }

    fun refreshPortals() {
        viewModelScope.launch {
            val currentState = _state.value
            val cachedPortals = authRepository.cachedPortalsFlow.first()
            val retainedPortals = currentState.portals.ifEmpty { cachedPortals }
            val initialSelectedPortalId = authRepository.selectedPortalIdFlow.first()
                ?: currentState.selectedPortalId
                ?: retainedPortals.firstOrNull()?.id
            val retainedHealth = retainedPortals.associate { portal ->
                portal.id to (currentState.portalHealth[portal.id] ?: PortalHealth())
            }

            _state.update {
                it.copy(
                    portals = retainedPortals.ifEmpty { it.portals },
                    portalHealth = retainedHealth.ifEmpty { it.portalHealth },
                    selectedPortalId = initialSelectedPortalId,
                    isLoadingPortals = true,
                    errorMessage = null,
                )
            }

            val freshPortals = fetchPortalsWithRetry()
            val portals = freshPortals.ifEmpty { retainedPortals }
            val portalHealth = probePortalHealth(portals, currentState.portalHealth)
            val resolvedSelectedId = chooseSelectedPortalId(
                selectedPortalId = initialSelectedPortalId,
                portals = portals,
                portalHealth = portalHealth,
            )

            if (resolvedSelectedId != null) {
                authRepository.setSelectedPortal(resolvedSelectedId)
            }

            _state.update {
                it.copy(
                    portals = portals,
                    portalHealth = portalHealth,
                    selectedPortalId = resolvedSelectedId,
                    isLoadingPortals = false,
                    errorMessage = when {
                        portals.isEmpty() -> "No services found. Check backend connection."
                        resolvedSelectedId == null -> null
                        else -> null
                    },
                )
            }
        }
    }

    private suspend fun fetchPortalsWithRetry(): List<com.smartifly.tv.domain.model.Portal> {
        val retryDelays = listOf(0L, 350L, 900L)

        retryDelays.forEachIndexed { index, delayMs ->
            if (delayMs > 0) {
                delay(delayMs)
            }

            val portals = runCatching {
                authRepository.fetchPortals(forceRefresh = true)
                    .ifEmpty { authRepository.fetchPortals(forceRefresh = false) }
            }.getOrElse { emptyList() }

            if (portals.isNotEmpty()) {
                return portals
            }

            if (index == retryDelays.lastIndex) {
                return emptyList()
            }
        }

        return emptyList()
    }

    private suspend fun probePortalHealth(
        portals: List<Portal>,
        previousHealth: Map<String, PortalHealth>,
    ): Map<String, PortalHealth> {
        if (portals.isEmpty()) return emptyMap()

        _state.update { state ->
            state.copy(
                portalHealth = portals.associate { portal ->
                    portal.id to PortalHealth(
                        status = if (previousHealth[portal.id]?.status == PortalHealthStatus.ONLINE) {
                            PortalHealthStatus.ONLINE
                        } else {
                            PortalHealthStatus.CHECKING
                        },
                        latencyMs = previousHealth[portal.id]?.latencyMs
                    )
                }
            )
        }

        return coroutineScope {
            portals.map { portal ->
                async {
                    portal.id to authRepository.probePortalHealth(portal)
                }
            }.awaitAll().toMap()
        }
    }

    private fun chooseSelectedPortalId(
        selectedPortalId: String?,
        portals: List<Portal>,
        portalHealth: Map<String, PortalHealth>,
    ): String? {
        if (portals.isEmpty()) return null

        val preferredSelectedId = selectedPortalId
            ?.takeIf { candidateId ->
                portals.any { it.id == candidateId } &&
                    portalHealth[candidateId]?.status == PortalHealthStatus.ONLINE
            }
        if (preferredSelectedId != null) {
            return preferredSelectedId
        }

        val firstOnlinePortalId = portals.firstOrNull { portal ->
            portalHealth[portal.id]?.status == PortalHealthStatus.ONLINE
        }?.id
        if (firstOnlinePortalId != null) {
            return firstOnlinePortalId
        }

        return null
    }

    fun onPortalSelected(portalId: String) {
        viewModelScope.launch {
            if (_state.value.portalHealth[portalId]?.status == PortalHealthStatus.CHECKING) {
                return@launch
            }
            authRepository.setSelectedPortal(portalId)
            _state.update { it.copy(selectedPortalId = portalId, errorMessage = null) }
        }
    }

    fun onActiveFieldChanged(field: ActiveField) {
        _state.update { it.copy(activeField = field, errorMessage = null) }
    }

    fun onKeyPress(value: String) {
        _state.update { current ->
            when (current.activeField) {
                ActiveField.USERNAME -> current.copy(username = (current.username + value).take(64))
                ActiveField.PASSWORD -> current.copy(password = (current.password + value).take(64))
            }
        }
    }

    fun onBackspace() {
        _state.update { current ->
            when (current.activeField) {
                ActiveField.USERNAME -> current.copy(
                    username = current.username.dropLast(1),
                    errorMessage = null
                )
                ActiveField.PASSWORD -> current.copy(
                    password = current.password.dropLast(1),
                    errorMessage = null
                )
            }
        }
    }

    fun onClearActiveField() {
        _state.update { current ->
            when (current.activeField) {
                ActiveField.USERNAME -> current.copy(username = "", errorMessage = null)
                ActiveField.PASSWORD -> current.copy(password = "", errorMessage = null)
            }
        }
    }

    fun submit(onSuccess: () -> Unit) {
        val snapshot = _state.value
        val portal = snapshot.selectedPortal

        when {
            portal == null -> {
                _state.update { it.copy(errorMessage = NoPortalSelectedAuthException().message) }
                return
            }
            snapshot.selectedPortalHealth.status == PortalHealthStatus.CHECKING -> {
                _state.update { it.copy(errorMessage = "Checking selected service. Please wait a moment.") }
                return
            }
            snapshot.selectedPortalHealth.status != PortalHealthStatus.ONLINE -> {
                _state.update { it.copy(errorMessage = "Selected service: ${portal.name} is offline. Please choose another.") }
                return
            }
            snapshot.username.isBlank() -> {
                _state.update { it.copy(errorMessage = "Username is required.") }
                return
            }
            snapshot.password.isBlank() -> {
                _state.update { it.copy(errorMessage = "Password is required.") }
                return
            }
        }

        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, errorMessage = null) }
            
            val deviceId = deviceProvider.getDeviceId()
            val licenseResult = authRepository.checkLicense(deviceId)
            if (licenseResult.isFailure) {
                _state.update {
                    it.copy(
                        isSubmitting = false,
                        errorMessage = licenseResult.exceptionOrNull().toUserFacingLoginMessage(
                            fallback = "Device license check failed."
                        )
                    )
                }
                return@launch
            }

            val result = authRepository.login(
                portal = portal,
                username = snapshot.username,
                password = snapshot.password,
            )

            result.onSuccess { session ->
                profileRepository.ensureDefaultProfile(session.username)
                _state.update { it.copy(isSubmitting = false) }
                onSuccess()
            }.onFailure { error ->
                // If login failed due to reachability on a previously "online" server, update health state
                val isReachabilityFailure = error is AuthTimeoutException || error is ServiceUnavailableAuthException
                
                if (isReachabilityFailure) {
                    viewModelScope.launch {
                        val freshHealth = authRepository.probePortalHealth(portal)
                        _state.update { current ->
                            current.copy(
                                portalHealth = current.portalHealth + (portal.id to freshHealth),
                                isSubmitting = false,
                                errorMessage = "Service temporarily unavailable. Its status has been updated to ${freshHealth.status.name.lowercase()}."
                            )
                        }
                    }
                } else {
                    _state.update {
                        it.copy(
                            isSubmitting = false,
                            errorMessage = error.toUserFacingLoginMessage(
                                fallback = "Login failed. Check credentials and try again."
                            )
                        )
                    }
                }
            }
        }
    }

    private fun Throwable?.toUserFacingLoginMessage(fallback: String): String {
        val error = this ?: return fallback

        return when {
            error is NoPortalSelectedAuthException ||
                error is InvalidCredentialsAuthException ||
                error is ServiceUnavailableAuthException ||
                error is AuthTimeoutException ||
                error is MalformedXtreamResponseAuthException -> {
                error.message ?: fallback
            }
            error is UnknownHostException || error is ConnectException -> {
                ServiceUnavailableAuthException().message ?: fallback
            }
            error is SocketTimeoutException -> {
                AuthTimeoutException().message ?: fallback
            }
            else -> fallback
        }
    }

    companion object {
        fun factory(
            authRepository: AuthRepository,
            profileRepository: ProfileRepository,
            deviceProvider: DeviceProvider,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return LoginViewModel(authRepository, profileRepository, deviceProvider) as T
            }
        }
    }
}
