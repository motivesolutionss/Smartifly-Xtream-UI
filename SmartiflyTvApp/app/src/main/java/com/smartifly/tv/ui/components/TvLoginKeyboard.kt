package com.smartifly.tv.ui.components

import android.view.KeyEvent as AndroidKeyEvent
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.automirrored.outlined.Backspace
import androidx.compose.material.icons.Icons
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartifly.tv.ui.design.TvTokens

private val numberRow = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
private val letterRowsRaw = listOf(
    listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p"),
    listOf("a", "s", "d", "f", "g", "h", "j", "k", "l", "-"),
    listOf("z", "x", "c", "v", "b", "n", "m", "_"),
)
private val symbolRows = listOf(
    listOf("!", "@", "#", "$", "%", "^", "&", "*", "(", ")"),
    listOf("+", "=", "{", "}", "[", "]", "|", "\\", ":", ";"),
    listOf("\"", "'", "<", ">", ",", ".", "?", "/"),
)
private val domainRow = listOf("@gmail.com", "@yahoo.com", "@outlook.com")

@Composable
fun TvLoginKeyboard(
    modifier: Modifier = Modifier,
    requestInitialFocus: Boolean = false,
    firstKeyFocusRequester: FocusRequester? = null,
    firstKeyLeftFocusRequester: FocusRequester? = null,
    onKeyPress: (String) -> Unit,
    onBackspace: () -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
) {
    var showSymbols by remember { mutableStateOf(false) }
    var uppercase by remember { mutableStateOf(false) }

    val letterRows = if (showSymbols) {
        symbolRows
    } else if (uppercase) {
        letterRowsRaw.map { row ->
            row.map { key ->
                if (key.length == 1 && key[0].isLetter()) key.uppercase() else key
            }
        }
    } else {
        letterRowsRaw
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 3.dp, vertical = 3.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            numberRow.forEachIndexed { index, key ->
                val isFirst = index == 0
                LoginKeyButton(
                    text = key,
                    modifier = Modifier.weight(1f),
                    requestInitialFocus = requestInitialFocus && isFirst,
                    focusRequester = if (isFirst) firstKeyFocusRequester else null,
                    leftFocusRequester = if (isFirst) firstKeyLeftFocusRequester else null,
                    onClick = { onKeyPress(key) }
                )
            }
        }

        letterRows.forEachIndexed { rowIndex, row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                if (rowIndex == 2) {
                    LoginKeyButton(
                        text = if (showSymbols) "ABC" else "Shift",
                        modifier = Modifier.weight(2f),
                        compactText = true,
                        onClick = {
                            if (showSymbols) {
                                showSymbols = false
                            } else {
                                uppercase = !uppercase
                            }
                        }
                    )
                }

                row.forEach { key ->
                    LoginKeyButton(
                        text = key,
                        modifier = Modifier.weight(1f),
                        onClick = { onKeyPress(key) }
                    )
                }
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            domainRow.forEach { domain ->
                LoginKeyButton(
                    text = domain,
                    modifier = Modifier.weight(1f),
                    compactText = true,
                    onClick = { onKeyPress(domain) }
                )
            }
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            LoginKeyButton(
                text = if (showSymbols) "ABC" else "!#$",
                modifier = Modifier.weight(1.4f),
                onClick = { showSymbols = !showSymbols }
            )
            LoginKeyButton(text = "@", modifier = Modifier.weight(1f), onClick = { onKeyPress("@") })
            LoginKeyButton(text = ".", modifier = Modifier.weight(1f), onClick = { onKeyPress(".") })
            LoginKeyButton(
                text = ".com",
                modifier = Modifier.weight(1.5f),
                onClick = { onKeyPress(".com") }
            )
            LoginKeyButton(
                text = "Backspace",
                modifier = Modifier.weight(1.3f),
                backspaceStyle = true,
                onClick = onBackspace
            )
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            LoginKeyButton(
                text = "Back",
                modifier = Modifier.weight(1.5f),
                keyHeight = 32.dp,
                compactText = true,
                onClick = onBack
            )
            LoginKeyButton(
                text = "Space",
                modifier = Modifier.weight(2.9f),
                keyHeight = 32.dp,
                compactText = true,
                onClick = { onKeyPress(" ") }
            )
            LoginKeyButton(
                text = "Next",
                modifier = Modifier.weight(1.5f),
                keyHeight = 32.dp,
                primary = true,
                compactText = true,
                onClick = onNext
            )
        }
    }
}

@Composable
private fun LoginKeyButton(
    text: String,
    modifier: Modifier = Modifier,
    primary: Boolean = false,
    compactText: Boolean = false,
    backspaceStyle: Boolean = false,
    keyHeight: Dp = 32.dp,
    requestInitialFocus: Boolean = false,
    focusRequester: FocusRequester? = null,
    leftFocusRequester: FocusRequester? = null,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    val shape = RoundedCornerShape(7.dp)
    val borderColor = when {
        primary -> TvTokens.Colors.Primary
        focused -> Color(0xFF00B4D8)
        else -> Color(0xFF1E3448)
    }

    val backgroundBrush = when {
        primary -> Brush.verticalGradient(
            colors = listOf(Color(0xFFFF1B2D), Color(0xFFCC0000))
        )
        focused -> Brush.verticalGradient(
            colors = listOf(Color(0xFF1A3247), Color(0xFF122436))
        )
        else -> Brush.verticalGradient(
            colors = listOf(Color(0xFF13263A), Color(0xFF0E1C2C))
        )
    }

    val textColor = when {
        primary -> Color.White
        focused -> Color.White
        else -> Color(0xFFAAAAAA)
    }
    val isBottomAction = text == "Back" || text == "Space" || text == "Next"

    Box(
        modifier = modifier
            .height(keyHeight)
            .shadow(
                elevation = if (focused) 14.dp else 2.dp,
                shape = shape,
                ambientColor = if (focused) Color(0xAA00B4D8) else Color(0x33000000),
                spotColor = if (focused) Color(0xAA00B4D8) else Color(0x33000000)
            )
            .border(
                width = if (focused) 2.dp else 1.dp,
                color = borderColor,
                shape = shape
            )
            .background(backgroundBrush, shape)
            .focusRequester(resolvedFocusRequester)
            .focusProperties {
                leftFocusRequester?.let { left = it }
            }
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
                        resolvedFocusRequester.requestFocus()
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
            .padding(horizontal = 3.dp),
        contentAlignment = Alignment.Center
    ) {
        if (backspaceStyle) {
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.Backspace,
                contentDescription = null,
                tint = textColor,
                modifier = Modifier.size(18.dp)
            )
        } else {
            Text(
                text = text,
                style = if (isBottomAction) {
                    TvTokens.TvType.BodyMedium.copy(fontWeight = FontWeight.Medium, fontSize = 15.sp)
                } else if (primary) {
                    TvTokens.TvType.ButtonSmall.copy(fontWeight = FontWeight.Bold, fontSize = 15.sp)
                } else if (compactText) {
                    TvTokens.TvType.LabelSmall.copy(fontSize = 11.sp)
                } else {
                    TvTokens.TvType.BodyMedium.copy(fontWeight = FontWeight.Medium, fontSize = 15.sp)
                },
                color = textColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
fun TvLoginKeyboardPreview() {
    TvLoginKeyboard(
        onKeyPress = {},
        onBackspace = {},
        onNext = {},
        onBack = {}
    )
}
