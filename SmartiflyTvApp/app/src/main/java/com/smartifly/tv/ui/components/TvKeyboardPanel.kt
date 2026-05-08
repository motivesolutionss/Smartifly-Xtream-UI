package com.smartifly.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame

private sealed interface KeyboardCell {
    data class Character(val label: String, val value: String = label.lowercase()) : KeyboardCell
    data class Action(val label: String, val weight: Float = 1f, val onClick: () -> Unit) : KeyboardCell
}

private val characterRows = listOf(
    listOf("A", "B", "C", "D", "E", "F"),
    listOf("G", "H", "I", "J", "K", "L"),
    listOf("M", "N", "O", "P", "Q", "R"),
    listOf("S", "T", "U", "V", "W", "X"),
    listOf("Y", "Z", "1", "2", "3", "4"),
    listOf("5", "6", "7", "8", "9", "0"),
)

@Composable
fun TvKeyboardPanel(
    modifier: Modifier = Modifier,
    requestInitialFocus: Boolean = false,
    firstKeyFocusRequester: FocusRequester? = null,
    firstKeyLeftFocusRequester: FocusRequester? = null,
    firstKeyRightFocusRequester: FocusRequester? = null,
    onKeyPress: (String) -> Unit,
    onBackspace: () -> Unit,
    onClear: () -> Unit,
) {
    val rows = remember(onBackspace, onClear) {
        buildList<List<KeyboardCell>> {
            addAll(characterRows.map { row -> row.map { KeyboardCell.Character(label = it) } })
            add(listOf(KeyboardCell.Action(label = "Space", onClick = { onKeyPress(" ") })))
            add(
                listOf(
                    KeyboardCell.Action(label = "Clear All", onClick = onClear),
                    KeyboardCell.Action(label = "Backspace", onClick = onBackspace)
                )
            )
        }
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        rows.forEachIndexed { rowIndex, row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEachIndexed { cellIndex, cell ->
                    val isFirstKey = rowIndex == 0 && cellIndex == 0
                    val isRightEdge = cellIndex == row.size - 1
                    
                    when (cell) {
                        is KeyboardCell.Character -> KeyboardKey(
                            label = cell.label,
                            modifier = Modifier.weight(1f),
                            requestInitialFocus = requestInitialFocus && isFirstKey,
                            focusRequester = if (isFirstKey) firstKeyFocusRequester else null,
                            leftFocusRequester = if (isFirstKey) firstKeyLeftFocusRequester else null,
                            rightFocusRequester = if (isRightEdge) firstKeyRightFocusRequester else null,
                            onClick = { onKeyPress(cell.value) }
                        )

                        is KeyboardCell.Action -> KeyboardKey(
                            label = cell.label,
                            modifier = Modifier.weight(cell.weight),
                            isControl = true,
                            rightFocusRequester = if (isRightEdge) firstKeyRightFocusRequester else null,
                            onClick = cell.onClick
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun KeyboardKey(
    label: String,
    modifier: Modifier = Modifier,
    isControl: Boolean = false,
    requestInitialFocus: Boolean = false,
    focusRequester: FocusRequester? = null,
    leftFocusRequester: FocusRequester? = null,
    rightFocusRequester: FocusRequester? = null,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current

    val scale by animateFloatAsState(
        targetValue = if (focused) 1.04f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "keyboardKeyScale"
    )

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    Box(
        modifier = modifier
            .height(if (isControl) 54.dp else 58.dp)
            .scale(scale)
            .background(
                brush = Brush.verticalGradient(
                    colors = when {
                        focused -> listOf(
                            TvTokens.Colors.Primary.copy(alpha = 0.96f),
                            TvTokens.Colors.PrimaryDark.copy(alpha = 0.96f)
                        )
                        isControl -> listOf(
                            TvTokens.Colors.SurfaceMuted.copy(alpha = 0.92f),
                            TvTokens.Colors.Surface.copy(alpha = 0.92f)
                        )
                        else -> listOf(
                            TvTokens.Colors.BackgroundElevated.copy(alpha = 0.78f),
                            TvTokens.Colors.Surface.copy(alpha = 0.9f)
                        )
                    },
                ),
                shape = TvKeyShape
            )
            .border(
                width = 1.dp,
                color = when {
                    focused -> TvTokens.Colors.PrimaryLight
                    isControl -> TvTokens.Colors.BorderMedium
                    else -> TvTokens.Colors.Border
                },
                shape = TvKeyShape
            )
            .focusRequester(resolvedFocusRequester)
            .focusProperties { 
                leftFocusRequester?.let { left = it }
                rightFocusRequester?.let { right = it }
            }
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            style = if (isControl) TvTokens.TvType.LabelMedium else TvTokens.TvType.H4,
            color = TvTokens.Colors.TextPrimary,
            fontWeight = if (focused || isControl) FontWeight.SemiBold else FontWeight.Medium
        )
    }
}

private val TvKeyShape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun TvKeyboardPanelPreview() {
    var text by remember { mutableStateOf("") }

    PreviewFrame {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = if (text.isBlank()) "Type with the keyboard" else text,
                color = TvTokens.Colors.TextPrimary,
                style = TvTokens.TvType.H3
            )
            TvKeyboardPanel(
                requestInitialFocus = true,
                onKeyPress = { text += it },
                onBackspace = { text = text.dropLast(1) },
                onClear = { text = "" }
            )
        }
    }
}
