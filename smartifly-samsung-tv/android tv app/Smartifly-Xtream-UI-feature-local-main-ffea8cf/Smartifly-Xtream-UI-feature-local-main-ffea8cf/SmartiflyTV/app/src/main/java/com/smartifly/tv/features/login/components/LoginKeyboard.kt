package com.smartifly.tv.features.login.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SurfaceDark
import com.smartifly.tv.ui.theme.SurfaceMedium
import com.smartifly.tv.ui.theme.TextPrimary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LoginKeyboard(
    onKeyClick: (String) -> Unit,
    onBackspace: () -> Unit,
    onEnter: () -> Unit,
    actionLabel: String = "Next",
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var isUppercase by remember { mutableStateOf(false) }
    var isSymbols by remember { mutableStateOf(false) }
    
    val toggleCase = { char: String ->
        if (isUppercase) char.uppercase() else char.lowercase()
    }

    val row2Keys = if (isSymbols) listOf("[", "]", "{", "}", "#", "%", "^", "*", "+", "=") 
                   else listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p")
    
    val row3Keys = if (isSymbols) listOf("_", "\\", "|", "~", "<", ">", "€", "£", "¥", "/")
                   else listOf("a", "s", "d", "f", "g", "h", "j", "k", "l", "-")
                   
    val row4Keys = if (isSymbols) listOf(".", ",", "?", "!", "'", "\"", ":", ";")
                   else listOf("z", "x", "c", "v", "b", "n", "m", "_")

    Column(
        modifier = modifier
            .background(SurfaceDark.copy(alpha = 0.8f), RoundedCornerShape(16.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        // Row 1: Numbers
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0").forEach { key ->
                KeyItem(text = key, onClick = { onKeyClick(key) }, modifier = Modifier.weight(1f))
            }
        }
        
        // Row 2
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            row2Keys.forEach { key ->
                val displayKey = if (isSymbols) key else toggleCase(key)
                KeyItem(text = displayKey, onClick = { onKeyClick(displayKey) }, modifier = Modifier.weight(1f))
            }
        }
        
        // Row 3
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            row3Keys.forEach { key ->
                val displayKey = if (isSymbols) key else toggleCase(key)
                KeyItem(text = displayKey, onClick = { onKeyClick(displayKey) }, modifier = Modifier.weight(1f))
            }
        }
        
        // Row 4
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            KeyItem(
                text = "↑", 
                onClick = { isUppercase = !isUppercase }, 
                modifier = Modifier.weight(2f), 
                isSpecial = true,
                isPrimary = isUppercase,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
            )
            row4Keys.forEach { key ->
                val displayKey = if (isSymbols || key == "_") key else toggleCase(key)
                KeyItem(text = displayKey, onClick = { onKeyClick(displayKey) }, modifier = Modifier.weight(1f))
            }
        }

        // Row 5: @gmail.com @yahoo.com @outlook.com
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("@gmail.com", "@yahoo.com", "@outlook.com").forEach { shortcut ->
                KeyItem(text = shortcut, onClick = { onKeyClick(shortcut) }, modifier = Modifier.weight(1f), isSpecial = true)
            }
        }

        // Row 6: !#$ @ . .com [X]
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            KeyItem(
                text = if (isSymbols) "ABC" else "!#$", 
                onClick = { isSymbols = !isSymbols }, 
                modifier = Modifier.weight(1.5f), 
                isSpecial = true,
                isPrimary = isSymbols
            )
            KeyItem(text = "@", onClick = { onKeyClick("@") }, modifier = Modifier.weight(1f))
            KeyItem(text = ".", onClick = { onKeyClick(".") }, modifier = Modifier.weight(1f))
            KeyItem(text = ".com", onClick = { onKeyClick(".com") }, modifier = Modifier.weight(2f))
            KeyItem(text = "⌫", onClick = onBackspace, modifier = Modifier.weight(1.5f), isSpecial = true)
        }

        // Row 7: Back Space Next
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            KeyItem(text = "Back", onClick = onBack, modifier = Modifier.weight(2f), isSpecial = true)
            KeyItem(text = "Space", onClick = { onKeyClick(" ") }, modifier = Modifier.weight(4f))
            KeyItem(text = actionLabel, onClick = onEnter, modifier = Modifier.weight(2.5f), isPrimary = true)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun KeyItem(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isSpecial: Boolean = false,
    isPrimary: Boolean = false,
    fontSize: androidx.compose.ui.unit.TextUnit? = null,
    fontWeight: FontWeight? = null
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .height(34.dp)
            .onFocusChanged { isFocused = it.isFocused },
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isPrimary) PrimaryRed.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.04f),
            focusedContainerColor = if (isPrimary) PrimaryRed else SurfaceMedium
        ),
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = Border(
                androidx.compose.foundation.BorderStroke(
                    com.smartifly.tv.ui.theme.Dimensions.FocusBorderWidth,
                    Color.White
                )
            )
        ),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevation = 0.dp,
                elevationColor = Color.Transparent
            )
        )
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                color = if (isFocused && isPrimary) Color.White else TextPrimary,
                fontWeight = fontWeight ?: (if (isFocused) FontWeight.Bold else FontWeight.Medium),
                fontSize = fontSize ?: (if (isSpecial) 10.sp else 13.sp)
            )
        }
    }
}
