package com.smartifly.tv.feature.loading

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.HomeCatalogData
import com.smartifly.tv.domain.provider.DeviceProvider
import com.smartifly.tv.domain.repository.CatalogRepository
import com.smartifly.tv.domain.repository.DownloadsRepository
import com.smartifly.tv.domain.repository.MasterControlRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class LoadingPhase {
    RUNNING,
    READY,
    FAILED,
}

enum class BootstrapStageStatus {
    PENDING,
    RUNNING,
    SUCCEEDED,
    FAILED,
}

data class BootstrapStage(
    val label: String,
    val status: BootstrapStageStatus = BootstrapStageStatus.PENDING,
)

data class LoadingState(
    val progress: Int = 0,
    val stageLabel: String = "INITIALIZING ENGINE",
    val phase: LoadingPhase = LoadingPhase.RUNNING,
    val errorMessage: String? = null,
    val stages: List<BootstrapStage> = DEFAULT_STAGES.map(::BootstrapStage),
    val hasMinimumContentReady: Boolean = false,
    val usingCachedHome: Boolean = false,
) {
    val completed: Boolean
        get() = phase == LoadingPhase.READY

    companion object {
        val DEFAULT_STAGES = listOf(
            "VALIDATING SESSION",
            "SYNCING DOWNLOADS",
            "LOADING HOME CATALOG",
            "CHECKING ANNOUNCEMENTS",
            "CHECKING UPDATES",
        )
    }
}

class LoadingViewModel(
    private val session: AuthSession,
    private val catalogRepository: CatalogRepository,
    private val downloadsRepository: DownloadsRepository,
    private val deviceProvider: DeviceProvider,
    private val masterControlRepository: MasterControlRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(LoadingState())
    val state: StateFlow<LoadingState> = _state.asStateFlow()

    init {
        bootstrap()
    }

    fun retryBootstrap() {
        bootstrap()
    }

    private fun bootstrap() {
        viewModelScope.launch {
            _state.value = LoadingState()

            val sessionReady = runStage(
                label = "VALIDATING SESSION",
                index = 0,
                targetProgress = 8,
            ) {
                require(session.serverUrl.isNotBlank()) { "Session is invalid." }
                require(session.username.isNotBlank()) { "Session is invalid." }
                require(session.password.isNotBlank()) { "Session is invalid." }
            }
            if (sessionReady.isFailure) {
                markBootstrapFailed("Session is invalid. Please sign in again.")
                return@launch
            }

            runStage(
                label = "SYNCING DOWNLOADS",
                index = 1,
                targetProgress = 24,
            ) {
                downloadsRepository.refreshStatuses()
            }

            val cachedHome = catalogRepository.getCachedHomeCatalog(session)
            val catalogResult = runStage(
                label = "LOADING HOME CATALOG",
                index = 2,
                targetProgress = 72,
            ) {
                catalogRepository.loadHomeCatalog(session).getOrThrow()
            }
            val minimumContentReady = catalogResult.getOrNull().hasMinimumHomeContent() ||
                cachedHome.hasMinimumHomeContent()

            runStage(
                label = "CHECKING ANNOUNCEMENTS",
                index = 3,
                targetProgress = 88,
            ) {
                masterControlRepository.getRemoteAnnouncements()
                catalogRepository.getAnnouncements()
            }

            runStage(
                label = "CHECKING UPDATES",
                index = 4,
                targetProgress = 100,
            ) {
                masterControlRepository.checkAppUpdate()
            }

            if (minimumContentReady) {
                _state.update {
                    it.copy(
                        progress = 100,
                        stageLabel = if (cachedHome != null && catalogResult.isFailure) {
                            "OPENING CACHED HOME"
                        } else {
                            "READY"
                        },
                        phase = LoadingPhase.READY,
                        errorMessage = null,
                        hasMinimumContentReady = true,
                        usingCachedHome = cachedHome != null && catalogResult.isFailure,
                    )
                }
            } else {
                markBootstrapFailed("Unable to prepare home content. Retry to try again.")
            }
        }
    }

    private suspend fun <T> runStage(
        label: String,
        index: Int,
        targetProgress: Int,
        block: suspend () -> T,
    ): Result<T> {
        _state.update { state ->
            state.copy(
                stageLabel = label,
                stages = state.stages.updateStage(index, BootstrapStageStatus.RUNNING),
            )
        }
        val result = runCatching { block() }
        _state.update {
            it.copy(
                progress = maxOf(it.progress, targetProgress.coerceIn(0, 100)),
                stages = it.stages.updateStage(
                    index = index,
                    status = if (result.isSuccess) {
                        BootstrapStageStatus.SUCCEEDED
                    } else {
                        BootstrapStageStatus.FAILED
                    },
                ),
            )
        }
        return result
    }

    private fun markBootstrapFailed(message: String) {
        _state.update {
            it.copy(
                phase = LoadingPhase.FAILED,
                errorMessage = message,
                stageLabel = "BOOTSTRAP FAILED",
            )
        }
    }

    companion object {
        fun factory(
            session: AuthSession,
            catalogRepository: CatalogRepository,
            downloadsRepository: DownloadsRepository,
            deviceProvider: DeviceProvider,
            masterControlRepository: MasterControlRepository,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return LoadingViewModel(
                    session = session,
                    catalogRepository = catalogRepository,
                    downloadsRepository = downloadsRepository,
                    deviceProvider = deviceProvider,
                    masterControlRepository = masterControlRepository,
                ) as T
            }
        }
    }
}

private fun List<BootstrapStage>.updateStage(
    index: Int,
    status: BootstrapStageStatus,
): List<BootstrapStage> {
    return mapIndexed { currentIndex, stage ->
        if (currentIndex == index) stage.copy(status = status) else stage
    }
}

private fun HomeCatalogData?.hasMinimumHomeContent(): Boolean {
    if (this == null) return false
    return rails.isNotEmpty() || allItems.isNotEmpty()
}
