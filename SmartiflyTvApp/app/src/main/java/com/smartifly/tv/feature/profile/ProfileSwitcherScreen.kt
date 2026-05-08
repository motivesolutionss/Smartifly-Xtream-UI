package com.smartifly.tv.feature.profile

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartifly.tv.domain.model.UserProfile
import com.smartifly.tv.ui.components.SmartiflyBackdrop
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens

@Composable
fun ProfileSwitcherScreen(
    viewModel: ProfileViewModel,
    onProfileSelected: () -> Unit,
    onProfilePinRequired: (String) -> Unit,
    onAddProfile: () -> Unit,
    onEditProfile: (String) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    SmartiflyBackdrop(showLogo = true) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 86.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(28.dp)
        ) {
            Text(
                text = "Who's Watching?",
                style = TvTokens.TvType.DisplayMedium.copy(fontSize = 42.sp, lineHeight = 48.sp),
                color = TvTokens.Colors.TextPrimary,
                fontWeight = FontWeight.SemiBold,
                fontStyle = FontStyle.Italic,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterHorizontally),
                    modifier = Modifier
                        .fillMaxWidth(0.84f)
                        .height(210.dp)
                ) {
                    itemsIndexed(state.profiles, key = { _, profile -> profile.id }) { index, profile ->
                        ProfileCard(
                            profile = profile,
                            isActive = profile.id == state.activeProfileId,
                            requestInitialFocus = index == 0,
                            onClick = {
                                if (profile.pinRequired) {
                                    onProfilePinRequired(profile.id)
                                } else {
                                    viewModel.selectProfile(profile.id, onProfileSelected)
                                }
                            }
                        )
                    }
                    item {
                        AddProfileCard(
                            requestInitialFocus = state.profiles.isEmpty(),
                            onClick = onAddProfile
                        )
                    }
                }
            }

            TvFocusButton(
                text = "Edit Active",
                compact = true,
                modifier = Modifier.width(220.dp),
                onClick = {
                    state.activeProfileId?.let(onEditProfile)
                }
            )
        }
    }
}

@Composable
private fun ProfileCard(
    profile: UserProfile,
    isActive: Boolean,
    requestInitialFocus: Boolean = false,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    val scale by animateFloatAsState(targetValue = if (focused) 1.04f else 1f, label = "profileScale")

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            focusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    val initials = profile.name.trim().split(" ")
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
        .ifBlank { "U" }

    Box(
        modifier = Modifier
            .width(160.dp)
            .height(196.dp)
            .scale(scale)
            .border(
                width = if (focused) 3.dp else 2.dp,
                color = when {
                    focused -> TvTokens.Colors.FocusCyan
                    isActive -> TvTokens.Colors.Border.copy(alpha = 0.7f)
                    else -> TvTokens.Colors.Border.copy(alpha = 0.55f)
                },
                shape = RoundedCornerShape(20.dp)
            )
            .background(TvTokens.Colors.Surface.copy(alpha = 0.82f), RoundedCornerShape(20.dp))
            .focusRequester(focusRequester)
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(
                        brush = Brush.sweepGradient(
                            colors = listOf(
                                TvTokens.Colors.AccentCyan.copy(alpha = 0.7f),
                                TvTokens.Colors.Tertiary.copy(alpha = 0.74f),
                                TvTokens.Colors.AccentGold.copy(alpha = 0.82f),
                                TvTokens.Colors.AccentCyan.copy(alpha = 0.7f)
                            )
                        ),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = initials,
                    style = TvTokens.TvType.DisplayMedium.copy(fontSize = 40.sp, lineHeight = 40.sp),
                    color = TvTokens.Colors.TextInverse,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Text(
                text = profile.name,
                style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
                color = TvTokens.Colors.TextPrimary,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .width(144.dp)
                    .padding(horizontal = 8.dp)
            )

            if (profile.pinRequired) {
                Text(
                    text = "PIN PROTECTED",
                    style = TvTokens.TvType.LabelMedium,
                    color = TvTokens.Colors.AccentGold,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun AddProfileCard(
    requestInitialFocus: Boolean,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    val scale by animateFloatAsState(targetValue = if (focused) 1.04f else 1f, label = "addProfileScale")

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            focusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    Box(
        modifier = Modifier
            .width(160.dp)
            .height(196.dp)
            .scale(scale)
            .border(
                width = if (focused) 3.dp else 2.dp,
                color = if (focused) TvTokens.Colors.FocusCyan else TvTokens.Colors.Border.copy(alpha = 0.55f),
                shape = RoundedCornerShape(20.dp)
            )
            .background(TvTokens.Colors.Surface.copy(alpha = 0.78f), RoundedCornerShape(20.dp))
            .focusRequester(focusRequester)
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .background(TvTokens.Colors.BackgroundInput, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.material3.Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = null,
                    tint = TvTokens.Colors.TextPrimary,
                    modifier = Modifier.size(52.dp)
                )
            }
            Text(
                text = "Add Profile",
                style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
                color = TvTokens.Colors.TextPrimary,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .width(144.dp)
                    .padding(horizontal = 8.dp)
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun ProfileSwitcherScreenPreview() {
    val viewModel = remember { ProfileViewModel(profileRepository = previewProfileRepository()) }
    ProfileSwitcherScreen(
        viewModel = viewModel,
        onProfileSelected = {},
        onProfilePinRequired = {},
        onAddProfile = {},
        onEditProfile = {}
    )
}
