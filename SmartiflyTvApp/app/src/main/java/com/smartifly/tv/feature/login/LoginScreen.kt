package com.smartifly.tv.feature.login

import android.view.KeyEvent as AndroidKeyEvent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.Image
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartifly.tv.R
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.PortalHealth
import com.smartifly.tv.domain.model.PortalHealthStatus
import com.smartifly.tv.ui.components.SmartiflyBackdrop
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.components.TvLoginKeyboard
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.styling.TvStyles

private enum class LoginStep {
    USERNAME,
    PASSWORD,
    SERVER,
}

private const val MAX_LOGIN_PORTALS = 5

private enum class ServerCardSize {
    SOLO,
    STANDARD,
    COMPACT,
}

private data class PortalRowItem(
    val index: Int,
    val portal: Portal,
)

private data class PortalRowSpec(
    val items: List<PortalRowItem>,
    val widthFraction: Float,
)

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLoginSuccess: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var step by rememberSaveable { mutableStateOf(LoginStep.USERNAME) }
    var showPassword by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(step) {
        when (step) {
            LoginStep.USERNAME -> viewModel.onActiveFieldChanged(ActiveField.USERNAME)
            LoginStep.PASSWORD -> viewModel.onActiveFieldChanged(ActiveField.PASSWORD)
            LoginStep.SERVER -> {
                if (state.portals.isEmpty() && !state.isLoadingPortals) {
                    viewModel.refreshPortals()
                }
            }
        }
    }

    SmartiflyBackdrop(showLogo = false) {
        Box(
            modifier = Modifier
                .fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 72.dp, vertical = 48.dp)
            ) {
                if (step == LoginStep.SERVER) {
                    ServerSelectionStep(
                        state = state,
                        onBack = { step = LoginStep.PASSWORD },
                        onRetry = viewModel::refreshPortals,
                        onPortalSelected = viewModel::onPortalSelected,
                        onSubmit = { viewModel.submit(onSuccess = onLoginSuccess) }
                    )
                } else {
                    CredentialStep(
                        state = state,
                        step = step,
                    onSwitchToUsername = { step = LoginStep.USERNAME },
                    onSwitchToPassword = { step = LoginStep.PASSWORD },
                    onContinue = {
                        step = when (step) {
                            LoginStep.USERNAME -> {
                                if (state.username.isBlank()) LoginStep.USERNAME else LoginStep.PASSWORD
                            }
                            LoginStep.PASSWORD -> {
                                if (state.password.isBlank()) LoginStep.PASSWORD else LoginStep.SERVER
                            }
                            LoginStep.SERVER -> LoginStep.SERVER
                        }
                    },
                        onBack = {
                            if (step == LoginStep.PASSWORD) {
                                step = LoginStep.USERNAME
                                showPassword = false
                            }
                        },
                        onKeyPress = viewModel::onKeyPress,
                        onBackspace = viewModel::onBackspace,
                        showPassword = showPassword,
                        onTogglePasswordVisibility = { showPassword = !showPassword },
                    )
                }
            }

            if (step != LoginStep.SERVER) {
                FooterHelp(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 14.dp)
                )
            }
        }
    }
}

@Composable
private fun CredentialStep(
    state: LoginState,
    step: LoginStep,
    onSwitchToUsername: () -> Unit,
    onSwitchToPassword: () -> Unit,
    onContinue: () -> Unit,
    onBack: () -> Unit,
    onKeyPress: (String) -> Unit,
    onBackspace: () -> Unit,
    showPassword: Boolean,
    onTogglePasswordVisibility: () -> Unit,
) {
    val initialFocusRequester = remember { FocusRequester() }
    val keyboardEntryFocusRequester = remember { FocusRequester() }
    val isInPreview = LocalInspectionMode.current

    LaunchedEffect(Unit) {
        if (!isInPreview) {
            initialFocusRequester.requestFocus()
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 4.dp, bottom = 14.dp)
            .background(TvStyles.frostedPanelSoft, RoundedCornerShape(34.dp))
            .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(34.dp))
            .padding(horizontal = 34.dp, vertical = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(22.dp)
    ) {
        Column(
            modifier = Modifier
                .weight(1.02f)
                .fillMaxHeight()
                .padding(horizontal = 8.dp, vertical = 2.dp),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(1.dp)
                    .focusRequester(initialFocusRequester)
                    .focusProperties { down = keyboardEntryFocusRequester }
                    .focusable()
            )
            Text(
                text = "Welcome Back",
                style = TvTokens.TvType.DisplayMedium.copy(fontSize = 36.sp, lineHeight = 39.sp),
                color = TvTokens.Colors.TextPrimary,
                fontStyle = FontStyle.Italic,
                textAlign = TextAlign.Start,
                maxLines = 1,
                overflow = TextOverflow.Clip,
            )
            Text(
                text = "Sign in to continue your entertainment journey",
                style = TvTokens.TvType.BodySmall.copy(fontSize = 15.sp, lineHeight = 19.sp),
                color = TvTokens.Colors.TextSecondary.copy(alpha = 0.88f),
                textAlign = TextAlign.Start,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            LoginStepIndicator(
                step = step,
                modifier = Modifier
                    .padding(top = 4.dp, bottom = 0.dp)
                    .align(Alignment.CenterHorizontally)
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(top = 24.dp),
                contentAlignment = Alignment.TopStart
            ) {
                TvLoginKeyboard(
                    requestInitialFocus = false,
                    firstKeyFocusRequester = keyboardEntryFocusRequester,
                    onKeyPress = onKeyPress,
                    onBackspace = onBackspace,
                    onNext = onContinue,
                    onBack = onBack,
                )
            }
        }

        Box(
            modifier = Modifier
                .padding(vertical = 10.dp)
                .width(1.dp)
                .fillMaxHeight()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            TvTokens.Colors.BorderStrong.copy(alpha = 0.22f),
                            TvTokens.Colors.BorderStrong.copy(alpha = 0.22f),
                            Color.Transparent
                        )
                    )
                )
        )

        Box(
            modifier = Modifier
                .weight(0.84f)
                .fillMaxHeight()
                .padding(start = 2.dp, end = 8.dp)
        ) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                TvTokens.Colors.FocusCyan.copy(alpha = 0.05f),
                                Color.Transparent
                            )
                        )
                    )
            )
            Image(
                painter = painterResource(id = R.drawable.smartifly_icon),
                contentDescription = "Smartifly",
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 2.dp, end = 4.dp)
                    .height(52.dp)
                    .alpha(0.92f)
            )
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 142.dp),
                verticalArrangement = Arrangement.Top
            ) {
                val isUsername = step == LoginStep.USERNAME
                Column(
                    modifier = Modifier
                        .wrapContentHeight()
                        .widthIn(max = 720.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = if (isUsername) "USERNAME" else "PASSWORD",
                        style = TvTokens.TvType.H1.copy(fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 17.sp),
                        color = TvTokens.Colors.TextSecondary,
                        letterSpacing = 1.6.sp
                    )
                    LoginInputCard(
                        value = if (isUsername) state.username else state.password,
                        placeholder = if (isUsername) "Enter your username" else "Enter your password",
                        obscureValue = !isUsername && !showPassword,
                        isPassword = !isUsername,
                        onTogglePasswordVisibility = if (isUsername) null else onTogglePasswordVisibility,
                        onClick = {
                            if (isUsername) onSwitchToUsername() else onSwitchToPassword()
                        }
                    )
                    if (!state.errorMessage.isNullOrBlank()) {
                        Text(
                            text = state.errorMessage.orEmpty(),
                            style = TvTokens.TvType.BodySmall.copy(fontSize = 16.sp, lineHeight = 22.sp),
                            color = TvTokens.Colors.Error
                        )
                    }
                    Text(
                        text = buildAnnotatedString {
                            append("Need assistance? ")
                            withStyle(
                                SpanStyle(
                                    color = TvTokens.Colors.TextPrimary,
                                    textDecoration = TextDecoration.Underline
                                )
                            ) {
                                append("Smartifly.io/support")
                            }
                        },
                        style = TvTokens.TvType.LabelSmall.copy(fontSize = 11.sp, lineHeight = 15.sp),
                        color = TvTokens.Colors.TextSecondary.copy(alpha = 0.9f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ServerSelectionStep(
    state: LoginState,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onPortalSelected: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    val visiblePortals = remember(state.portals) { state.portals.take(MAX_LOGIN_PORTALS) }
    val portalRows = remember(visiblePortals) { buildPortalRows(visiblePortals) }
    val hasNoPortals = visiblePortals.isEmpty()
    val areAllPortalsUnavailable = !hasNoPortals && state.areAllPortalsUnavailable
    val densePortalLayout = visiblePortals.size >= 4
    val veryDensePortalLayout = visiblePortals.size == 5
    val cardSize = when (visiblePortals.size) {
        0, 1 -> ServerCardSize.SOLO
        2, 3 -> ServerCardSize.STANDARD
        else -> ServerCardSize.COMPACT
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 4.dp, bottom = 14.dp)
            .background(TvStyles.frostedPanelSoft, RoundedCornerShape(34.dp))
            .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(34.dp))
            .padding(horizontal = 34.dp, vertical = 20.dp)
            .padding(top = if (veryDensePortalLayout) 6.dp else if (densePortalLayout) 10.dp else 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Top
    ) {
        Text(
            text = "Welcome Back",
            style = TvTokens.TvType.DisplayMedium.copy(
                fontSize = if (veryDensePortalLayout) 28.sp else if (densePortalLayout) 30.sp else 32.sp,
                lineHeight = if (veryDensePortalLayout) 31.sp else if (densePortalLayout) 34.sp else 36.sp
            ),
            color = TvTokens.Colors.TextPrimary,
            fontStyle = FontStyle.Italic,
            maxLines = 1,
            overflow = TextOverflow.Clip,
        )
        Text(
            text = "Sign in to continue your entertainment journey",
            style = TvTokens.TvType.BodySmall.copy(
                fontSize = if (veryDensePortalLayout) 9.sp else if (densePortalLayout) 10.sp else 11.sp,
                lineHeight = if (veryDensePortalLayout) 11.sp else if (densePortalLayout) 12.sp else 14.sp
            ),
            color = TvTokens.Colors.TextSecondary.copy(alpha = 0.86f),
            modifier = Modifier.padding(top = if (densePortalLayout) 4.dp else 6.dp),
            maxLines = 1,
            overflow = TextOverflow.Clip,
        )

        LoginStepIndicator(
            step = LoginStep.SERVER,
            modifier = Modifier.padding(top = if (densePortalLayout) 10.dp else 14.dp)
        )

        Box(
            modifier = Modifier
                .widthIn(max = 1120.dp)
                .fillMaxWidth()
                .padding(
                    horizontal = if (densePortalLayout) 16.dp else 24.dp,
                    vertical = if (veryDensePortalLayout) 8.dp else 12.dp
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        width = 1.dp,
                        color = TvTokens.Colors.BorderMedium.copy(alpha = 0.6f),
                        shape = RoundedCornerShape(28.dp)
                    )
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color(0x3A122131),
                                Color(0x20101C28)
                            )
                        ),
                        RoundedCornerShape(28.dp)
                    )
                    .padding(
                        horizontal = if (densePortalLayout) 16.dp else 18.dp,
                        vertical = if (veryDensePortalLayout) 12.dp else if (densePortalLayout) 14.dp else 16.dp
                    ),
                verticalArrangement = Arrangement.spacedBy(
                    if (veryDensePortalLayout) 8.dp else if (densePortalLayout) 10.dp else 14.dp
                )
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(18.dp)
                                .shadow(
                                    elevation = 12.dp,
                                    shape = RoundedCornerShape(6.dp),
                                    ambientColor = TvStyles.GlowColors.focus,
                                    spotColor = TvStyles.GlowColors.focus
                                )
                                .background(TvTokens.Colors.FocusCyan, RoundedCornerShape(6.dp))
                        )
                        Text(
                            text = "SELECT SERVICE",
                            style = TvTokens.TvType.H2.copy(fontSize = 14.sp, lineHeight = 18.sp),
                            color = TvTokens.Colors.TextSecondary,
                            letterSpacing = 1.4.sp
                        )
                    }
                    Box(
                        modifier = Modifier
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        TvTokens.Colors.FocusCyan.copy(alpha = 0.10f),
                                        Color.White.copy(alpha = 0.04f)
                                    )
                                ),
                                RoundedCornerShape(99.dp)
                            )
                            .border(
                                width = 1.dp,
                                color = TvTokens.Colors.BorderMedium.copy(alpha = 0.6f),
                                shape = RoundedCornerShape(99.dp)
                            )
                            .padding(horizontal = 11.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "${visiblePortals.size} server${if (visiblePortals.size == 1) "" else "s"} available",
                            style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp),
                            color = TvTokens.Colors.TextSecondary.copy(alpha = 0.82f)
                        )
                    }
                }

                if (state.isLoadingPortals && hasNoPortals) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(182.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "Loading services...",
                                style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
                                color = TvTokens.Colors.TextPrimary
                            )
                            Text(
                                text = "Fetching your available portals.",
                                style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp),
                                color = TvTokens.Colors.TextSecondary.copy(alpha = 0.82f)
                            )
                        }
                    }
                } else if (hasNoPortals) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(182.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "No services available right now.",
                                style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
                                color = TvTokens.Colors.TextPrimary
                            )
                            Text(
                                text = "Please retry or check the backend connection.",
                                style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp),
                                color = TvTokens.Colors.TextSecondary.copy(alpha = 0.82f)
                            )
                            TvFocusButton(
                                text = "Retry",
                                primary = true,
                                compact = true,
                                modifier = Modifier.width(168.dp),
                                onClick = onRetry
                            )
                        }
                    }
                } else if (areAllPortalsUnavailable) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(182.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "All services are unavailable.",
                                style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
                                color = TvTokens.Colors.TextPrimary
                            )
                            Text(
                                text = "Retry to check for an online service or go back.",
                                style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp),
                                color = TvTokens.Colors.TextSecondary.copy(alpha = 0.82f)
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TvFocusButton(
                                    text = "Back",
                                    compact = true,
                                    modifier = Modifier.width(168.dp),
                                    onClick = onBack
                                )
                                TvFocusButton(
                                    text = "Retry",
                                    primary = true,
                                    compact = true,
                                    modifier = Modifier.width(168.dp),
                                    onClick = onRetry
                                )
                            }
                        }
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(
                            if (veryDensePortalLayout) 8.dp else if (densePortalLayout) 10.dp else 14.dp
                        )
                    ) {
                        portalRows.forEach { row ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth(row.widthFraction)
                                    .align(Alignment.CenterHorizontally),
                                horizontalArrangement = Arrangement.spacedBy(
                                    if (veryDensePortalLayout) 10.dp else if (densePortalLayout) 12.dp else 16.dp
                                )
                            ) {
                                row.items.forEach { item ->
                                    ServerCard(
                                        modifier = Modifier.weight(1f),
                                        portal = item.portal,
                                        health = state.portalHealth[item.portal.id] ?: PortalHealth(),
                                        selected = item.portal.id == state.selectedPortalId,
                                        requestInitialFocus = item.index == 0,
                                        cardSize = cardSize,
                                        onClick = { onPortalSelected(item.portal.id) }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(if (densePortalLayout) 0.dp else 2.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        BottomButtonRow(
                            onBack = onBack,
                            onSubmit = onSubmit,
                            denseLayout = densePortalLayout,
                            isSubmitting = state.isSubmitting,
                            canSubmit = state.canSubmitSelectedPortal
                        )
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(if (densePortalLayout) 16.dp else 18.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        if (!state.errorMessage.isNullOrBlank()) {
                            Text(
                                text = state.errorMessage.orEmpty(),
                                style = TvTokens.TvType.LabelSmall.copy(fontSize = 9.sp, lineHeight = 11.sp),
                                color = TvTokens.Colors.Error.copy(alpha = 0.88f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                if (hasNoPortals) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        TvFocusButton(
                            text = "Back",
                            compact = true,
                            modifier = Modifier.width(168.dp),
                            onClick = onBack
                        )
                    }
                }

                Text(
                    text = buildAnnotatedString {
                        append("Need assistance? ")
                        withStyle(
                            SpanStyle(
                                color = TvTokens.Colors.TextPrimary,
                                textDecoration = TextDecoration.Underline
                            )
                        ) { append("smartifly.io/support") }
                    },
                    style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp),
                    color = TvTokens.Colors.TextSecondary,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}

@Composable
private fun RowScope.BottomButtonRow(
    onBack: () -> Unit,
    onSubmit: () -> Unit,
    denseLayout: Boolean = false,
    isSubmitting: Boolean = false,
    canSubmit: Boolean = true,
) {
    TvFocusButton(
        text = "Back",
        compact = true,
        enabled = !isSubmitting,
        modifier = Modifier.width(if (denseLayout) 144.dp else 178.dp),
        onClick = onBack
    )
    Spacer(modifier = Modifier.width(if (denseLayout) 12.dp else 14.dp))
    TvFocusButton(
        text = if (isSubmitting) "Starting..." else "Start Watching",
        primary = true,
        compact = true,
        enabled = !isSubmitting && canSubmit,
        modifier = Modifier.width(if (denseLayout) 204.dp else 264.dp),
        onClick = onSubmit
    )
}

@Composable
private fun LoginStepIndicator(
    step: LoginStep,
    modifier: Modifier = Modifier,
) {
    val steps = listOf("Username", "Password", "Server")
    val activeIndex = when (step) {
        LoginStep.USERNAME -> 0
        LoginStep.PASSWORD -> 1
        LoginStep.SERVER -> 2
    }

    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        steps.forEachIndexed { index, label ->
            val completed = index < activeIndex
            val active = index == activeIndex
            val ringColor = when {
                completed -> TvTokens.Colors.FocusCyan
                active -> TvTokens.Colors.FocusCyan
                else -> TvTokens.Colors.BorderMedium
            }
            val fillBrush = when {
                completed -> TvStyles.accentButton
                active -> Brush.verticalGradient(
                    colors = listOf(
                        TvTokens.Colors.BackgroundInput.copy(alpha = 0.96f),
                        TvTokens.Colors.Surface.copy(alpha = 0.96f)
                    )
                )
                else -> TvStyles.glassDark
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .shadow(
                            elevation = if (active || completed) 4.dp else 0.dp,
                            shape = CircleShape,
                            ambientColor = if (active || completed) TvStyles.GlowColors.focus else Color.Transparent,
                            spotColor = if (active || completed) TvStyles.GlowColors.focus else Color.Transparent
                        )
                        .border(0.9.dp, ringColor, CircleShape)
                        .background(fillBrush, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (completed) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = TvTokens.Colors.TextInverse,
                            modifier = Modifier.size(8.dp)
                        )
                    } else {
                        Text(
                            text = "${index + 1}",
                            color = if (active) TvTokens.Colors.FocusCyan else TvTokens.Colors.TextSecondary,
                            style = TvTokens.TvType.LabelSmall.copy(fontSize = 7.sp, lineHeight = 7.sp),
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Text(
                    text = label,
                    style = TvTokens.TvType.LabelSmall.copy(fontSize = 7.sp, lineHeight = 8.sp),
                    color = if (active || completed) TvTokens.Colors.TextPrimary else TvTokens.Colors.TextMuted,
                    modifier = Modifier
                        .padding(top = 3.dp)
                        .width(40.dp),
                    maxLines = 1,
                    softWrap = false,
                    textAlign = TextAlign.Center
                )
            }

            if (index != steps.lastIndex) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 6.dp)
                        .padding(bottom = 8.dp)
                        .width(24.dp)
                        .height(1.dp)
                        .background(
                            if (index < activeIndex) TvTokens.Colors.FocusCyan.copy(alpha = 0.7f)
                            else TvTokens.Colors.BorderMedium,
                            RoundedCornerShape(99.dp)
                        )
                )
            }
        }
    }
}

@Composable
private fun LoginInputCard(
    value: String,
    placeholder: String,
    obscureValue: Boolean,
    isPassword: Boolean,
    onTogglePasswordVisibility: (() -> Unit)?,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val displayValue = when {
        value.isBlank() -> placeholder
        obscureValue -> "*".repeat(value.length.coerceAtLeast(4).coerceAtMost(18))
        else -> value
    }

    val fieldBorderColor = if (focused) Color(0xFF00B4D8) else Color(0xFF1E3448)
    val fieldBrush = if (focused) {
        Brush.verticalGradient(
            colors = listOf(
                Color(0xFF1A3247),
                Color(0xFF122436)
            )
        )
    } else {
        Brush.verticalGradient(
            colors = listOf(
                Color(0xFF13263A),
                Color(0xFF0E1C2C)
            )
        )
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .shadow(
                elevation = if (focused) 12.dp else 5.dp,
                shape = RoundedCornerShape(7.dp),
                ambientColor = if (focused) TvStyles.GlowColors.focus else Color(0x40000000),
                spotColor = if (focused) TvStyles.GlowColors.focus else Color(0x40000000)
            )
            .border(
                width = if (focused) 2.dp else 1.1.dp,
                color = fieldBorderColor,
                shape = RoundedCornerShape(7.dp)
            )
            .background(fieldBrush, RoundedCornerShape(7.dp))
            .focusRequester(focusRequester)
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 14.dp, vertical = 6.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .size(30.dp)
                        .background(
                            if (focused) TvStyles.accentButton else Brush.verticalGradient(
                                colors = listOf(
                                    TvTokens.Colors.FocusCyan.copy(alpha = 0.18f),
                                    TvTokens.Colors.FocusCyan.copy(alpha = 0.12f)
                                )
                            ),
                            RoundedCornerShape(7.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isPassword) Icons.Default.Lock else Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = if (focused) TvTokens.Colors.TextInverse else TvTokens.Colors.FocusCyan
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = displayValue,
                        style = TvTokens.TvType.LabelLarge.copy(
                            fontWeight = FontWeight.Normal,
                            fontSize = 15.sp,
                            lineHeight = 18.sp
                        ),
                        color = if (value.isBlank()) {
                            TvTokens.Colors.TextSecondary.copy(alpha = 0.82f)
                        } else {
                            TvTokens.Colors.TextPrimary
                        },
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (isPassword && onTogglePasswordVisibility != null) {
                Box(
                    modifier = Modifier
                        .padding(start = 10.dp)
                        .size(42.dp)
                        .background(
                            TvTokens.Colors.TextPrimary.copy(alpha = if (focused) 0.16f else 0.08f),
                            CircleShape
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = onTogglePasswordVisibility
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Visibility,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = TvTokens.Colors.TextSecondary.copy(alpha = 0.9f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ServerCard(
    modifier: Modifier = Modifier,
    portal: Portal,
    health: PortalHealth,
    selected: Boolean,
    requestInitialFocus: Boolean,
    cardSize: ServerCardSize,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            focusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    val cardHeight = when (cardSize) {
        ServerCardSize.SOLO -> 96.dp
        ServerCardSize.STANDARD -> 86.dp
        ServerCardSize.COMPACT -> 70.dp
    }
    val cardShape = when (cardSize) {
        ServerCardSize.SOLO -> 20.dp
        ServerCardSize.STANDARD -> 18.dp
        ServerCardSize.COMPACT -> 16.dp
    }
    val iconSize = when (cardSize) {
        ServerCardSize.SOLO -> 50.dp
        ServerCardSize.STANDARD -> 42.dp
        ServerCardSize.COMPACT -> 34.dp
    }
    val iconRadius = when (cardSize) {
        ServerCardSize.SOLO -> 16.dp
        ServerCardSize.STANDARD -> 14.dp
        ServerCardSize.COMPACT -> 11.dp
    }
    val iconGlyphSize = when (cardSize) {
        ServerCardSize.SOLO -> 24.dp
        ServerCardSize.STANDARD -> 22.dp
        ServerCardSize.COMPACT -> 18.dp
    }
    val titleFontSize = when (cardSize) {
        ServerCardSize.SOLO -> 16.sp
        ServerCardSize.STANDARD -> 14.sp
        ServerCardSize.COMPACT -> 12.sp
    }
    val titleLineHeight = when (cardSize) {
        ServerCardSize.SOLO -> 19.sp
        ServerCardSize.STANDARD -> 17.sp
        ServerCardSize.COMPACT -> 14.sp
    }
    val subtitleFontSize = when (cardSize) {
        ServerCardSize.SOLO -> 10.sp
        ServerCardSize.STANDARD -> 9.sp
        ServerCardSize.COMPACT -> 7.sp
    }
    val subtitleLineHeight = when (cardSize) {
        ServerCardSize.SOLO -> 12.sp
        ServerCardSize.STANDARD -> 11.sp
        ServerCardSize.COMPACT -> 8.sp
    }
    val badgeSize = when (cardSize) {
        ServerCardSize.SOLO -> 30.dp
        ServerCardSize.STANDARD -> 26.dp
        ServerCardSize.COMPACT -> 22.dp
    }
    val badgeIconSize = when (cardSize) {
        ServerCardSize.SOLO -> 16.dp
        ServerCardSize.STANDARD -> 14.dp
        ServerCardSize.COMPACT -> 11.dp
    }
    val isOffline = health.status == PortalHealthStatus.OFFLINE
    val isChecking = health.status == PortalHealthStatus.CHECKING

    val ringColor = when {
        isOffline -> TvTokens.Colors.Error.copy(alpha = if (selected) 0.8f else 0.55f)
        focused -> TvTokens.Colors.FocusCyan.copy(alpha = 0.55f)
        selected -> TvTokens.Colors.FocusCyan.copy(alpha = 0.45f)
        else -> TvTokens.Colors.BorderMedium
    }

    val ringWidth = if (focused || selected) 1.4.dp else 1.2.dp
    val cardBrush = if (isOffline) {
        Brush.verticalGradient(
            colors = listOf(
                Color(0x33A63333),
                TvTokens.Colors.BackgroundInput.copy(alpha = 0.92f)
            )
        )
    } else if (selected) {
        Brush.verticalGradient(
            colors = listOf(
                TvTokens.Colors.FocusCyan.copy(alpha = 0.20f),
                TvTokens.Colors.BackgroundInput.copy(alpha = 0.96f)
            )
        )
    } else {
        TvStyles.glassDark
    }
    val iconBrush = if (isOffline) {
        Brush.verticalGradient(
            colors = listOf(
                TvTokens.Colors.Error.copy(alpha = 0.22f),
                TvTokens.Colors.Error.copy(alpha = 0.12f)
            )
        )
    } else if (selected) {
        TvStyles.accentButton
    } else {
        Brush.verticalGradient(
            colors = listOf(
                TvTokens.Colors.FocusCyan.copy(alpha = 0.18f),
                TvTokens.Colors.FocusCyan.copy(alpha = 0.10f)
            )
        )
    }
    val accentGlow = when {
        isOffline -> TvTokens.Colors.Error.copy(alpha = 0.12f)
        focused || selected -> TvTokens.Colors.FocusCyan.copy(alpha = 0.16f)
        else -> Color(0x40000000)
    }

    Box(
        modifier = modifier
            .height(cardHeight)
            .shadow(
                elevation = if (focused || selected) 8.dp else 6.dp,
                shape = RoundedCornerShape(cardShape),
                ambientColor = accentGlow,
                spotColor = accentGlow
            )
            .border(ringWidth, ringColor, RoundedCornerShape(cardShape))
            .background(cardBrush, RoundedCornerShape(cardShape))
            .focusRequester(focusRequester)
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                val byComposeKey = event.key == Key.Enter ||
                    event.key == Key.NumPadEnter ||
                    event.key == Key.DirectionCenter ||
                    event.key == Key.Spacebar

                val keyCode = event.nativeKeyEvent.keyCode
                val byNativeCode = keyCode == AndroidKeyEvent.KEYCODE_DPAD_CENTER ||
                    keyCode == AndroidKeyEvent.KEYCODE_ENTER ||
                    keyCode == AndroidKeyEvent.KEYCODE_NUMPAD_ENTER ||
                    keyCode == AndroidKeyEvent.KEYCODE_SPACE ||
                    keyCode == AndroidKeyEvent.KEYCODE_BUTTON_A ||
                    keyCode == AndroidKeyEvent.KEYCODE_BUTTON_SELECT

                if ((byComposeKey || byNativeCode) && event.type == KeyEventType.KeyUp) {
                    onClick()
                    if (!isInPreview) {
                        focusRequester.requestFocus()
                    }
                    true
                } else {
                    false
                }
            }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(
                horizontal = if (cardSize == ServerCardSize.COMPACT) 12.dp else 14.dp,
                vertical = if (cardSize == ServerCardSize.COMPACT) 12.dp else 14.dp
            )
    ) {
        if (focused || selected) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 2.dp)
                    .fillMaxWidth(0.52f)
                    .height(2.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color.Transparent,
                                TvTokens.Colors.FocusCyan.copy(alpha = if (selected) 0.9f else 0.6f),
                                Color.Transparent
                            )
                        ),
                        RoundedCornerShape(99.dp)
                    )
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(if (cardSize == ServerCardSize.COMPACT) 10.dp else 12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(iconSize)
                    .background(iconBrush, RoundedCornerShape(iconRadius)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Storage,
                    contentDescription = null,
                    tint = when {
                        isOffline -> TvTokens.Colors.Error
                        selected -> TvTokens.Colors.TextInverse
                        else -> TvTokens.Colors.FocusCyan
                    },
                    modifier = Modifier.size(iconGlyphSize)
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(if (cardSize == ServerCardSize.COMPACT) 1.dp else 2.dp)
            ) {
                Text(
                    text = portal.name.ifBlank { "Server" },
                    style = TvTokens.TvType.H3.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = titleFontSize,
                        lineHeight = titleLineHeight
                    ),
                    color = when {
                        isOffline -> TvTokens.Colors.TextPrimary.copy(alpha = 0.86f)
                        selected -> TvTokens.Colors.FocusCyan
                        else -> TvTokens.Colors.TextPrimary
                    },
                    maxLines = 1,
                    softWrap = false,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = portalSubtitle(portal = portal, health = health, selected = selected),
                    style = TvTokens.TvType.LabelSmall.copy(
                        fontSize = subtitleFontSize,
                        lineHeight = subtitleLineHeight
                    ),
                    color = TvTokens.Colors.TextSecondary.copy(alpha = 0.8f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (selected) {
                Box(
                    modifier = Modifier
                        .size(badgeSize)
                        .background(TvStyles.accentButton, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        tint = TvTokens.Colors.TextInverse,
                        modifier = Modifier.size(badgeIconSize)
                    )
                }
            }
        }
    }
}

private fun portalSubtitle(
    portal: Portal,
    health: PortalHealth,
    selected: Boolean,
): String {
    return when {
        health.status == PortalHealthStatus.CHECKING -> "Checking service health..."
        health.status == PortalHealthStatus.ONLINE && selected -> "Selected service is ready"
        health.status == PortalHealthStatus.ONLINE -> {
            health.latencyMs?.let { "${it} ms response" } ?: "Ready to connect"
        }
        health.status == PortalHealthStatus.OFFLINE -> "Service unavailable"
        portal.isPrimary -> "Primary portal"
        selected -> "Selected service"
        portal.name.isBlank() -> "Smartifly service"
        else -> "Secure portal"
    }
}

private fun buildPortalRows(portals: List<Portal>): List<PortalRowSpec> {
    val items = portals.mapIndexed { index, portal -> PortalRowItem(index = index, portal = portal) }
    return when (items.size) {
        0 -> emptyList()
        1 -> listOf(PortalRowSpec(items = items, widthFraction = 0.46f))
        2 -> listOf(PortalRowSpec(items = items, widthFraction = 0.74f))
        3 -> listOf(PortalRowSpec(items = items, widthFraction = 1f))
        4 -> listOf(
            PortalRowSpec(items = items.take(2), widthFraction = 0.76f),
            PortalRowSpec(items = items.drop(2), widthFraction = 0.76f),
        )
        else -> listOf(
            PortalRowSpec(items = items.take(3), widthFraction = 1f),
            PortalRowSpec(items = items.drop(3), widthFraction = 0.72f),
        )
    }
}

@Composable
private fun FooterHelp(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .background(TvStyles.frostedPanelSoft, RoundedCornerShape(999.dp))
            .border(1.dp, TvTokens.Colors.Border.copy(alpha = 0.2f), RoundedCornerShape(999.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(22.dp)
                .shadow(
                    elevation = 12.dp,
                    shape = RoundedCornerShape(8.dp),
                    ambientColor = TvStyles.GlowColors.focus,
                    spotColor = TvStyles.GlowColors.focus
                )
                .background(TvTokens.Colors.FocusCyan, RoundedCornerShape(8.dp))
        )
        Text(
            text = "  USE ARROWS",
            style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, letterSpacing = 1.4.sp),
            color = TvTokens.Colors.TextSecondary
        )
        Text(
            text = "  |  OK TO SELECT",
            style = TvTokens.TvType.LabelSmall.copy(fontSize = 10.sp, letterSpacing = 1.4.sp),
            color = TvTokens.Colors.TextMuted
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
fun CredentialStepUsernamePreview() {
    val mockState = LoginState(
        username = "johndoe",
        activeField = ActiveField.USERNAME
    )
    SmartiflyBackdrop {
        Box(modifier = androidx.compose.ui.Modifier.fillMaxSize().padding(horizontal = 80.dp, vertical = 32.dp)) {
            CredentialStep(
                state = mockState,
                step = LoginStep.USERNAME,
                onSwitchToUsername = {},
                onSwitchToPassword = {},
                onContinue = {},
                onBack = {},
                onKeyPress = {},
                onBackspace = {},
                showPassword = false,
                onTogglePasswordVisibility = {}
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
fun CredentialStepPasswordPreview() {
    val mockState = LoginState(
        username = "johndoe",
        password = "password123",
        activeField = ActiveField.PASSWORD
    )
    SmartiflyBackdrop {
        Box(modifier = androidx.compose.ui.Modifier.fillMaxSize().padding(horizontal = 80.dp, vertical = 32.dp)) {
            CredentialStep(
                state = mockState,
                step = LoginStep.PASSWORD,
                onSwitchToUsername = {},
                onSwitchToPassword = {},
                onContinue = {},
                onBack = {},
                onKeyPress = {},
                onBackspace = {},
                showPassword = false,
                onTogglePasswordVisibility = {}
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
fun ServerSelectionStepPreview() {
    val mockPortals = listOf(
        Portal(id = "1", name = "US East ", url = "http://us-east.com"),
        Portal(id = "2", name = "EU West ", url = "http://eu-west.com"),
        Portal(id = "3", name = "Asia South ", url = "http://asia.com")
    )
    val mockState = LoginState(
        portals = mockPortals,
        selectedPortalId = "1"
    )
    SmartiflyBackdrop {
        Box(modifier = androidx.compose.ui.Modifier.fillMaxSize().padding(horizontal = 80.dp, vertical = 32.dp)) {
            ServerSelectionStep(
                state = mockState,
                onBack = {},
                onRetry = {},
                onPortalSelected = {},
                onSubmit = {}
            )
        }
    }
}
