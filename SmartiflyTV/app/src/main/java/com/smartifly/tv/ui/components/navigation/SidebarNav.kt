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
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.smartifly.tv.navigation.Destination
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import com.smartifly.tv.R

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SidebarNav(
    selectedDestination: Destination,
    onDestinationSelected: (Destination) -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }
    val isLowEnd = com.smartifly.tv.performance.lowend.LocalPerformanceConfig.current.tier == com.smartifly.tv.performance.lowend.DeviceTier.LOW
    
    // Enterprise Glassmorphism Logic
    val backgroundColor = if (isLowEnd) {
        Color(0xFF0D1117) 
    } else {
        Color(0xFF0D1117).copy(alpha = 0.85f)
    }

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
            horizontalAlignment = Alignment.Start
        ) {
            // Smartifly Logo Integration
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.smartifly_icon),
                    contentDescription = "Smartifly",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
                
                if (isExpanded) {
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "SMARTIFLY",
                        style = MaterialTheme.typography.titleMedium,
                        color = PrimaryRed,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Black,
                        letterSpacing = 2.sp
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Destination.entries.forEach { destination ->
                    if (destination != Destination.Details && destination != Destination.Player) {
                        NavItem(
                            destination = destination,
                            isSelected = selectedDestination == destination,
                            isExpanded = isExpanded,
                            onClick = { onDestinationSelected(destination) }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
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
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = destination.icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = if (isSelected) PrimaryRed else LocalContentColor.current
            )
            
            if (isExpanded) {
                Spacer(modifier = Modifier.width(20.dp))
                Text(
                    text = destination.title,
                    maxLines = 1,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (isSelected) Color.White else TextSecondary
                )
            }
        }
    }
}
