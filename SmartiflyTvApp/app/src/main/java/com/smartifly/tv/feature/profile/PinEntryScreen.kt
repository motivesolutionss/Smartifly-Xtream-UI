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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens

@Composable
fun PinEntryScreen(
    profileName: String,
    viewModel: PinEntryViewModel,
    profileId: String,
    onSuccess: () -> Unit,
    onCancel: () -> Unit,
) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    fun appendDigit(digit: String) {
        if (pin.length < 4) {
            pin += digit
            error = null
        }
    }

    fun submit() {
        viewModel.submitPin(
            profileId = profileId,
            pin = pin,
            onSuccess = onSuccess,
            onError = { message ->
                error = message
                pin = ""
            }
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 44.dp, vertical = 28.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, TvTokens.Colors.SurfaceBorder, RoundedCornerShape(18.dp))
                .background(TvTokens.Colors.SurfaceMuted, RoundedCornerShape(18.dp))
                .padding(horizontal = 24.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "Profile PIN Required",
                style = MaterialTheme.typography.displaySmall,
                color = TvTokens.Colors.TextPrimary
            )
            Text(
                text = "Enter PIN for $profileName",
                style = MaterialTheme.typography.titleMedium,
                color = TvTokens.Colors.TextSecondary
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(4) { index ->
                    val filled = index < pin.length
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .border(
                                1.5.dp,
                                if (filled) TvTokens.Colors.FocusCyan else TvTokens.Colors.SurfaceBorder,
                                RoundedCornerShape(10.dp)
                            )
                            .background(TvTokens.Colors.Surface, RoundedCornerShape(10.dp))
                            .padding(vertical = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (filled) "•" else "-",
                            style = MaterialTheme.typography.headlineSmall,
                            color = TvTokens.Colors.TextPrimary
                        )
                    }
                }
            }

            if (error != null) {
                Text(
                    text = error.orEmpty(),
                    style = MaterialTheme.typography.bodyLarge,
                    color = TvTokens.Colors.Error
                )
            }

            val rows = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("0")
            )
            rows.forEachIndexed { rowIndex, row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    row.forEachIndexed { keyIndex, digit ->
                        TvFocusButton(
                            text = digit,
                            modifier = Modifier.weight(1f),
                            requestInitialFocus = rowIndex == 0 && keyIndex == 0,
                            onClick = { appendDigit(digit) }
                        )
                    }
                    if (row.size == 1) {
                        TvFocusButton(
                            text = "Backspace",
                            modifier = Modifier.weight(2f),
                            onClick = {
                                pin = pin.dropLast(1)
                                error = null
                            }
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                TvFocusButton(
                    text = "Submit",
                    onClick = { submit() }
                )
                TvFocusButton(
                    text = "Clear",
                    onClick = {
                        pin = ""
                        error = null
                    }
                )
                TvFocusButton(text = "Cancel", onClick = onCancel)
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun PinEntryScreenPreview() {
    val viewModel = remember { PinEntryViewModel(profileRepository = previewProfileRepository()) }
    PinEntryScreen(
        profileName = "Tom",
        viewModel = viewModel,
        profileId = "p1",
        onSuccess = {},
        onCancel = {}
    )
}
