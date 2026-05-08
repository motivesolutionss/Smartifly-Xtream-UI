package com.smartifly.tv.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Density
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.smartifly.tv.di.AppGraph
import com.smartifly.tv.feature.account.AccountSwitcherScreen
import com.smartifly.tv.feature.account.AccountSwitcherViewModel
import com.smartifly.tv.feature.home.HomeShellScreen
import com.smartifly.tv.feature.home.HomeViewModel
import com.smartifly.tv.feature.loading.LoadingViewModel
import com.smartifly.tv.feature.loading.TvLoadingScreen
import com.smartifly.tv.feature.login.LoginScreen
import com.smartifly.tv.feature.login.LoginViewModel
import com.smartifly.tv.feature.profile.PinEntryScreen
import com.smartifly.tv.feature.profile.PinEntryViewModel
import com.smartifly.tv.feature.profile.ProfileEditorScreen
import com.smartifly.tv.feature.profile.ProfileEditorViewModel
import com.smartifly.tv.feature.profile.ProfileSwitcherScreen
import com.smartifly.tv.feature.profile.ProfileViewModel
import com.smartifly.tv.ui.design.SmartiflyTvTheme

private sealed interface OverlayScreen {
    data object None : OverlayScreen
    data object Loading : OverlayScreen
    data object AccountSwitcher : OverlayScreen
    data class ProfileEditor(val profileId: String?) : OverlayScreen
    data class PinEntry(val profileId: String) : OverlayScreen
}

@Composable
fun SmartiflyTvRoot(appGraph: AppGraph) {
    val appViewModel: AppViewModel = viewModel(
        factory = AppViewModel.factory(
            authRepository = appGraph.authRepository,
            profileRepository = appGraph.profileRepository,
            masterControlRepository = appGraph.masterControlRepository,
        )
    )
    val appState by appViewModel.state.collectAsStateWithLifecycle()
    var overlay by remember { mutableStateOf<OverlayScreen>(OverlayScreen.None) }
    var bootstrappedSessionKey by remember { mutableStateOf<String?>(null) }
    val session = appState.session
    val sessionKey = session?.let { "${it.portalId}_${it.username}_${it.createdAt}" }

    LaunchedEffect(appState.phase, sessionKey) {
        if (appState.phase == AppPhase.HOME && sessionKey != null && bootstrappedSessionKey != sessionKey) {
            bootstrappedSessionKey = sessionKey
            overlay = OverlayScreen.Loading
        }
    }

    val currentDensity = LocalDensity.current
    CompositionLocalProvider(
        LocalDensity provides Density(
            density = currentDensity.density,
            fontScale = 0.82f
        )
    ) {
    SmartiflyTvTheme {
        when (val currentOverlay = overlay) {
            OverlayScreen.Loading -> {
                if (session != null) {
                    val loadingViewModel: LoadingViewModel = viewModel(
                        key = "loading_${session.portalId}_${session.username}_${session.createdAt}",
                        factory = LoadingViewModel.factory(
                            session = session,
                            catalogRepository = appGraph.catalogRepository,
                            downloadsRepository = appGraph.downloadsRepository,
                            deviceProvider = appGraph.deviceProvider,
                            masterControlRepository = appGraph.masterControlRepository,
                        )
                    )
                    TvLoadingScreen(
                        viewModel = loadingViewModel,
                        onFinished = { overlay = OverlayScreen.None },
                        onCancel = { overlay = OverlayScreen.None }
                    )
                } else {
                    LaunchedEffect(Unit) {
                        overlay = OverlayScreen.None
                    }
                }
            }

            OverlayScreen.AccountSwitcher -> {
                val accountSwitcherViewModel: AccountSwitcherViewModel = viewModel(
                    key = "account_switcher",
                    factory = AccountSwitcherViewModel.factory(
                        authRepository = appGraph.authRepository
                    )
                )
                AccountSwitcherScreen(
                    viewModel = accountSwitcherViewModel,
                    onDone = { overlay = OverlayScreen.Loading },
                    onCancel = { overlay = OverlayScreen.None }
                )
            }

            is OverlayScreen.ProfileEditor -> {
                val profileEditorViewModel: ProfileEditorViewModel = viewModel(
                    factory = ProfileEditorViewModel.factory(
                        profileRepository = appGraph.profileRepository
                    )
                )
                ProfileEditorScreen(
                    viewModel = profileEditorViewModel,
                    profileId = currentOverlay.profileId,
                    onDone = { overlay = OverlayScreen.None },
                    onCancel = { overlay = OverlayScreen.None }
                )
            }

            is OverlayScreen.PinEntry -> {
                val pinEntryViewModel: PinEntryViewModel = viewModel(
                    factory = PinEntryViewModel.factory(
                        profileRepository = appGraph.profileRepository
                    )
                )
                val profileName = appState.profileSet.profiles
                    .firstOrNull { it.id == currentOverlay.profileId }
                    ?.name
                    ?: "Profile"

                PinEntryScreen(
                    profileName = profileName,
                    viewModel = pinEntryViewModel,
                    profileId = currentOverlay.profileId,
                    onSuccess = { overlay = OverlayScreen.None },
                    onCancel = { overlay = OverlayScreen.None }
                )
            }

            OverlayScreen.None -> {
                AnimatedContent(
                    targetState = appState.phase,
                    transitionSpec = {
                        (fadeIn(animationSpec = tween(400)) + scaleIn(initialScale = 0.96f, animationSpec = tween(400)))
                            .togetherWith(fadeOut(animationSpec = tween(300)) + scaleOut(targetScale = 1.04f, animationSpec = tween(300)))
                    },
                    label = "rootTransition"
                ) { phase ->
                    when (phase) {
                        AppPhase.BOOTING -> Unit

                        AppPhase.BLOCKED -> {
                            BootBlockedScreen(
                                status = appState.bootAccess.status,
                                message = appState.bootAccess.message,
                                retryAllowed = appState.bootAccess.retryAllowed,
                                onRetry = appViewModel::retryStartupAccess,
                            )
                        }

                        AppPhase.LOGIN -> {
                            val loginViewModel: LoginViewModel = viewModel(
                                factory = LoginViewModel.factory(
                                    authRepository = appGraph.authRepository,
                                    profileRepository = appGraph.profileRepository,
                                    deviceProvider = appGraph.deviceProvider
                                )
                            )
                            LoginScreen(
                                viewModel = loginViewModel,
                                onLoginSuccess = { overlay = OverlayScreen.Loading }
                            )
                        }

                        AppPhase.PROFILE_SWITCHER -> {
                            val profileViewModel: ProfileViewModel = viewModel(
                                factory = ProfileViewModel.factory(
                                    profileRepository = appGraph.profileRepository
                                )
                            )
                            ProfileSwitcherScreen(
                                viewModel = profileViewModel,
                                onProfileSelected = {},
                                onProfilePinRequired = { profileId ->
                                    overlay = OverlayScreen.PinEntry(profileId)
                                },
                                onAddProfile = {
                                    overlay = OverlayScreen.ProfileEditor(profileId = null)
                                },
                                onEditProfile = { profileId ->
                                    overlay = OverlayScreen.ProfileEditor(profileId = profileId)
                                }
                            )
                        }

                        AppPhase.HOME -> {
                            val session = appState.session
                            if (session != null) {
                                val homeViewModel: HomeViewModel = viewModel(
                                    key = "home_${session.portalId}_${session.username}_${session.createdAt}",
                                    factory = HomeViewModel.factory(
                                        session = session,
                                        catalogRepository = appGraph.catalogRepository,
                                        profileRepository = appGraph.profileRepository,
                                        favoritesRepository = appGraph.favoritesRepository,
                                        settingsRepository = appGraph.settingsRepository,
                                        downloadsRepository = appGraph.downloadsRepository,
                                        watchHistoryRepository = appGraph.watchHistoryRepository,
                                        updateInstaller = appGraph.updateInstaller,
                                        deviceProvider = appGraph.deviceProvider,
                                        masterControlRepository = appGraph.masterControlRepository,
                                        preferences = appGraph.preferences
                                    )
                                )
                                HomeShellScreen(
                                    viewModel = homeViewModel,
                                    onSwitchProfile = appViewModel::openProfileSwitcher,
                                    onSwitchAccount = {
                                        overlay = OverlayScreen.AccountSwitcher
                                    },
                                    onLogout = appViewModel::logout
                                )
                            }
                        }
                    }
                }
            }
        }
    }   // SmartiflyTvTheme
    }   // CompositionLocalProvider
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun SmartiflyTvRootOverlayPreview() {
    SmartiflyTvTheme {
        // Preview placeholder
    }
}
