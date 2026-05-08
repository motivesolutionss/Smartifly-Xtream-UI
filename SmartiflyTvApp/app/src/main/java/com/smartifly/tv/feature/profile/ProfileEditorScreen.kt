package com.smartifly.tv.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.components.TvLoginKeyboard
import com.smartifly.tv.ui.components.TvValueField
import com.smartifly.tv.ui.design.TvTokens

private enum class EditorField {
    NAME,
    PIN,
}

private val ratingOptions = listOf("G", "PG", "PG-13", "R", "NC-17")

@Composable
fun ProfileEditorScreen(
    viewModel: ProfileEditorViewModel,
    profileId: String?,
    onDone: () -> Unit,
    onCancel: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val profile = state.profiles.firstOrNull { it.id == profileId }

    var initializedFor by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    var avatarSeed by remember { mutableIntStateOf(1) }
    var isKidsProfile by remember { mutableStateOf(false) }
    var pinEnabled by remember { mutableStateOf(false) }
    var pin by remember { mutableStateOf("") }
    var maxRatingIndex by remember { mutableIntStateOf(ratingOptions.lastIndex) }
    var activeField by remember { mutableStateOf(EditorField.NAME) }

    LaunchedEffect(profileId, profile?.id) {
        val targetKey = profile?.id ?: "__new__"
        if (initializedFor != targetKey) {
            name = profile?.name.orEmpty()
            avatarSeed = profile?.avatarSeed ?: 1
            isKidsProfile = profile?.isKidsProfile ?: false
            pinEnabled = profile?.pinRequired ?: false
            pin = ""
            val rating = profile?.maxRating
            val idx = ratingOptions.indexOf(rating).takeIf { it >= 0 } ?: ratingOptions.lastIndex
            maxRatingIndex = idx
            activeField = EditorField.NAME
            initializedFor = targetKey
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 40.dp, vertical = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Column(
            modifier = Modifier.weight(1.18f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = if (profileId == null) "Create Profile" else "Edit Profile",
                style = MaterialTheme.typography.displaySmall,
                color = TvTokens.Colors.TextPrimary
            )
            Text(
                text = "Use TV keyboard to fill profile details.",
                style = MaterialTheme.typography.titleMedium,
                color = TvTokens.Colors.TextSecondary
            )

            TvLoginKeyboard(
                requestInitialFocus = true,
                onKeyPress = { value ->
                    when (activeField) {
                        EditorField.NAME -> {
                            name = (name + value).take(24)
                            viewModel.clearError()
                        }
                        EditorField.PIN -> {
                            val onlyDigits = value.filter { it.isDigit() }
                            if (onlyDigits.isNotBlank()) {
                                pin = (pin + onlyDigits).take(4)
                                viewModel.clearError()
                            }
                        }
                    }
                },
                onBackspace = {
                    when (activeField) {
                        EditorField.NAME -> name = name.dropLast(1)
                        EditorField.PIN -> pin = pin.dropLast(1)
                    }
                },
                onNext = {
                    activeField = when (activeField) {
                        EditorField.NAME -> if (pinEnabled) EditorField.PIN else EditorField.NAME
                        EditorField.PIN -> EditorField.NAME
                    }
                },
                onBack = {
                    if (activeField == EditorField.PIN) activeField = EditorField.NAME
                }
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TvValueField(
                label = "Profile Name",
                value = name,
                placeholder = "Enter profile name",
                isActive = activeField == EditorField.NAME,
                onClick = {
                    activeField = EditorField.NAME
                    viewModel.clearError()
                }
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, TvTokens.Colors.SurfaceBorder, RoundedCornerShape(14.dp))
                    .background(TvTokens.Colors.SurfaceMuted, RoundedCornerShape(14.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Avatar",
                        style = MaterialTheme.typography.labelLarge,
                        color = TvTokens.Colors.TextSecondary
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TvFocusButton(
                            text = "-",
                            compact = true,
                            onClick = { avatarSeed = (avatarSeed - 1).coerceAtLeast(1) }
                        )
                        Text(
                            text = "Avatar $avatarSeed",
                            style = MaterialTheme.typography.titleMedium,
                            color = TvTokens.Colors.TextPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 10.dp)
                        )
                        TvFocusButton(
                            text = "+",
                            compact = true,
                            onClick = { avatarSeed = (avatarSeed + 1).coerceAtMost(24) }
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TvFocusButton(
                    text = if (isKidsProfile) "Kids: ON" else "Kids: OFF",
                    compact = true,
                    onClick = {
                        isKidsProfile = !isKidsProfile
                        if (isKidsProfile && maxRatingIndex > 1) {
                            maxRatingIndex = 1
                        }
                    }
                )
                TvFocusButton(
                    text = if (pinEnabled) "PIN: ON" else "PIN: OFF",
                    compact = true,
                    onClick = { pinEnabled = !pinEnabled }
                )
            }

            TvFocusButton(
                text = "Max Rating: ${ratingOptions[maxRatingIndex]}",
                compact = true,
                onClick = {
                    val maxIndex = if (isKidsProfile) 1 else ratingOptions.lastIndex
                    maxRatingIndex = if (maxRatingIndex >= maxIndex) 0 else maxRatingIndex + 1
                }
            )

            if (pinEnabled) {
                TvValueField(
                    label = "Profile PIN",
                    value = pin,
                    placeholder = if (profile?.pinHash != null) "Keep existing PIN or enter new 4 digits" else "Enter 4-digit PIN",
                    isActive = activeField == EditorField.PIN,
                    obscureValue = true,
                    onClick = {
                        activeField = EditorField.PIN
                        viewModel.clearError()
                    }
                )
            }

            if (state.errorMessage != null) {
                Text(
                    text = state.errorMessage.orEmpty(),
                    style = MaterialTheme.typography.bodyLarge,
                    color = TvTokens.Colors.Error
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                TvFocusButton(
                    text = "Save",
                    onClick = {
                        viewModel.saveProfile(
                            profileId = profileId,
                            name = name,
                            avatarSeed = avatarSeed,
                            isKidsProfile = isKidsProfile,
                            maxRating = ratingOptions[maxRatingIndex],
                            pinEnabled = pinEnabled,
                            pin = pin,
                            onSuccess = onDone
                        )
                    }
                )
                TvFocusButton(text = "Cancel", onClick = onCancel)
                if (profileId != null) {
                    TvFocusButton(
                        text = "Delete",
                        onClick = {
                            viewModel.deleteProfile(
                                profileId = profileId,
                                onSuccess = onDone
                            )
                        }
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun ProfileEditorScreenPreview() {
    val viewModel = remember { ProfileEditorViewModel(profileRepository = previewProfileRepository()) }
    ProfileEditorScreen(
        viewModel = viewModel,
        profileId = "p1",
        onDone = {},
        onCancel = {}
    )
}
