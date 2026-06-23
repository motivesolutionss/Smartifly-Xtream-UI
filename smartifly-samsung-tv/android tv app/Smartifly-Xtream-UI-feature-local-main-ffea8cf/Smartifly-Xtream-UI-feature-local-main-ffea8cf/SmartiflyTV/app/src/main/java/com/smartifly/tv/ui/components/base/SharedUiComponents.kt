@file:OptIn(androidx.tv.material3.ExperimentalTvMaterial3Api::class)

package com.smartifly.tv.ui.components.base

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.ui.theme.Dimensions

@Composable
fun Badge(
    text: String,
    containerColor: Color,
    contentColor: Color = Color.White,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(containerColor, RoundedCornerShape(Dimensions.BadgeCornerRadius))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = contentColor,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun DotSeparator(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .padding(horizontal = 8.dp)
            .size(4.dp)
            .background(Color.White.copy(alpha = 0.3f), CircleShape)
    )
}

@Composable
fun AppIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    containerColor: Color = Color.Transparent,
    focusedContainerColor: Color = Color.White.copy(alpha = 0.2f),
    content: @Composable () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.size(Dimensions.IconButtonSize),
        colors = ButtonDefaults.colors(
            containerColor = containerColor,
            focusedContainerColor = focusedContainerColor
        )
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            content()
        }
    }
}
