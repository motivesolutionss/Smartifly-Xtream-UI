package com.smartifly.tv.ui.components.search

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Backspace
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.SpaceBar
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.smartifly.tv.ui.theme.TextPrimary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SearchKeyboard(
    onKeyClick: (String) -> Unit,
    onDeleteClick: () -> Unit,
    onClearClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val keys = listOf(
        listOf("a", "b", "c", "d", "e", "f"),
        listOf("g", "h", "i", "j", "k", "l"),
        listOf("m", "n", "o", "p", "q", "r"),
        listOf("s", "t", "u", "v", "w", "x"),
        listOf("y", "z", "1", "2", "3", "4"),
        listOf("5", "6", "7", "8", "9", "0")
    )

    Column(
        modifier = modifier.width(272.dp), // Width matches 6 keys * 42dp + 5 gaps * 4dp = 272dp
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        keys.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                row.forEach { key ->
                    KeyButton(text = key, onClick = { onKeyClick(key) })
                }
            }
        }
        
        Spacer(modifier = Modifier.height(2.dp))
        
        // Fixed-width Space bar
        KeyButton(
            text = "Space",
            icon = Icons.Rounded.SpaceBar,
            onClick = { onKeyClick(" ") },
            width = 272.dp,
            height = 36.dp
        )
        
        // Clear All & Delete row (fixed widths)
        Row(
            modifier = Modifier.width(272.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            KeyButton(
                text = "Clear All",
                icon = Icons.Rounded.DeleteSweep,
                onClick = onClearClick,
                width = 134.dp, // 134 * 2 + 4 = 272dp
                height = 36.dp
            )
            KeyButton(
                text = "Delete",
                icon = Icons.AutoMirrored.Rounded.Backspace,
                onClick = onDeleteClick,
                width = 134.dp,
                height = 36.dp
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun KeyButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    width: Dp = 42.dp,
    height: Dp = 36.dp
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.1f else 1.0f, // 1.1f scale limits focused size expansion to stay within borders
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "keyScale"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier
            .size(width = width, height = height)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            },
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(8.dp)
            )
        ),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.08f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black,
            contentColor = TextPrimary
        )
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.fillMaxSize()
        ) {
            if (icon != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(horizontal = 4.dp)
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = text,
                        modifier = Modifier.size(14.dp),
                        tint = if (isFocused) Color.Black else TextPrimary
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = text,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            } else {
                Text(
                    text = text,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal,
                    fontSize = 18.sp // Nice, large, readable letter font size
                )
            }
        }
    }
}
