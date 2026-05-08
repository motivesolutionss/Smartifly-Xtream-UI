package com.smartifly.tv.ui.components.navigation

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import com.smartifly.tv.navigation.Destination
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SidebarNav(
    selectedDestination: Destination,
    onDestinationSelected: (Destination) -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }
    val isLowEnd = com.smartifly.tv.performance.lowend.LocalPerformanceConfig.current.tier == com.smartifly.tv.performance.lowend.DeviceTier.LOW
    
    val backgroundColor = if (isLowEnd) Color(0xFF0D1117) else Color(0xFF0D1117).copy(alpha = 0.8f)

    Box(
        modifier = modifier
            .fillMaxHeight()
            .width(if (isExpanded) 240.dp else 80.dp)
            .background(backgroundColor)
            .onFocusChanged { state -> isExpanded = state.hasFocus }
            .animateContentSize()
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(modifier = Modifier.size(40.dp).background(PrimaryRed, shape = androidx.compose.foundation.shape.CircleShape))
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Destination.entries.forEach { destination ->
                if (destination != Destination.Details && destination != Destination.Player) {
                    NavItem(
                        destination = destination,
                        isSelected = selectedDestination == destination,
                        isExpanded = isExpanded,
                        onClick = { onDestinationSelected(destination) }
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun NavItem(
    destination: Destination,
    isSelected: Boolean,
    isExpanded: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) Color.White.copy(alpha = 0.1f) else Color.Transparent,
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black,
            contentColor = if (isSelected) PrimaryRed else TextSecondary
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        modifier = Modifier
            .width(if (isExpanded) 200.dp else 48.dp)
            .height(48.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(modifier = Modifier.size(24.dp).background(if (isSelected) PrimaryRed else Color.Gray.copy(alpha = 0.5f), shape = androidx.compose.foundation.shape.CircleShape))
            
            if (isExpanded) {
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = destination.title,
                    maxLines = 1,
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}
