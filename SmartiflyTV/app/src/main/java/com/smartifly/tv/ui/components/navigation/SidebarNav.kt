package com.smartifly.tv.ui.components.navigation

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.navigation.Destination
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.fromHex
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SidebarNav(
    selectedDestination: Destination,
    onDestinationSelected: (Destination) -> Unit,
    onProfileClick: () -> Unit,
    selectedProfile: UserProfile? = null,
    onFocusChanged: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    // Dynamic width spring animation for premium response and peak performance
    val sidebarWidth by animateDpAsState(
        targetValue = if (isExpanded) Dimensions.SidebarExpandedWidth else Dimensions.SidebarCollapsedWidth,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "sidebarWidth"
    )

    val itemWidth by animateDpAsState(
        targetValue = if (isExpanded) Dimensions.SidebarExpandedItemWidth else Dimensions.SidebarCollapsedItemWidth,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "itemWidth"
    )

    // Deep Glassmorphic background - Slate Black matching premium TV interfaces
    val backgroundColor = Color(0xFF040609).copy(alpha = 0.88f)
    val borderGlowColor by animateColorAsState(
        targetValue = if (isExpanded) PrimaryRed.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.12f),
        animationSpec = tween(300),
        label = "borderGlow"
    )

    Box(
        modifier = modifier
            .padding(
                start = Dimensions.SidebarOuterStart,
                top = Dimensions.SidebarOuterVertical,
                bottom = Dimensions.SidebarOuterVertical
            )
            .fillMaxHeight()
            .width(sidebarWidth)
            .clip(RoundedCornerShape(24.dp))
            .background(backgroundColor)
            .border(
                width = 0.8.dp,
                color = borderGlowColor,
                shape = RoundedCornerShape(24.dp)
            )
            .onFocusChanged { state ->
                isExpanded = state.hasFocus
                onFocusChanged(state.hasFocus)
            }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {


            // Profile Selection / Switcher Chip
            val avatarColor = remember(selectedProfile) {
                fromHex(selectedProfile?.primaryColor)
            }
            val profileInteractionSource = remember { MutableInteractionSource() }
            val isProfileFocused by profileInteractionSource.collectIsFocusedAsState()

            val profileScale by animateFloatAsState(
                targetValue = if (isProfileFocused) 1.05f else 1.0f,
                animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMediumLow),
                label = "profileScale"
            )

            val avatarSize by animateDpAsState(
                targetValue = if (isProfileFocused) 32.dp else 28.dp,
                animationSpec = spring(stiffness = Spring.StiffnessMedium),
                label = "avatarSize"
            )

            Surface(
                onClick = onProfileClick,
                interactionSource = profileInteractionSource,
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = Color.White.copy(alpha = 0.04f),
                    focusedContainerColor = Color.White.copy(alpha = 0.12f),
                    focusedContentColor = Color.White,
                    contentColor = TextSecondary
                ),
                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(16.dp)),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
                modifier = Modifier
                    .padding(horizontal = 12.dp)
                    .width(itemWidth)
                    .height(48.dp)
                    .graphicsLayer {
                        scaleX = profileScale
                        scaleY = profileScale
                    }
                    .border(
                        width = 1.dp,
                        color = if (isProfileFocused) PrimaryRed.copy(alpha = 0.6f) else Color.Transparent,
                        shape = RoundedCornerShape(16.dp)
                    )
            ) {
                if (isExpanded) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(avatarSize)
                                .background(avatarColor, shape = RoundedCornerShape(percent = 50))
                                .border(
                                    width = if (isProfileFocused) 1.5.dp else 1.dp,
                                    color = if (isProfileFocused) Color.White else Color.White.copy(alpha = 0.3f),
                                    shape = RoundedCornerShape(percent = 50)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = selectedProfile?.name?.take(1)?.uppercase() ?: "?",
                                color = Color.White,
                                fontSize = if (isProfileFocused) 13.sp else 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(verticalArrangement = Arrangement.Center) {
                            Text(
                                text = selectedProfile?.name ?: "Guest",
                                maxLines = 1,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Switch Profile",
                                maxLines = 1,
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary.copy(alpha = 0.6f)
                            )
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(avatarSize)
                                .background(avatarColor, shape = RoundedCornerShape(percent = 50))
                                .border(
                                    width = if (isProfileFocused) 1.5.dp else 1.dp,
                                    color = if (isProfileFocused) Color.White else Color.White.copy(alpha = 0.3f),
                                    shape = RoundedCornerShape(percent = 50)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = selectedProfile?.name?.take(1)?.uppercase() ?: "?",
                                color = Color.White,
                                fontSize = if (isProfileFocused) 13.sp else 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(36.dp))
            
            // Sidebar Navigation Menu Items
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Destination.entries.forEach { destination ->
                    if (destination != Destination.Details && destination != Destination.Player) {
                        NavItem(
                            destination = destination,
                            isSelected = selectedDestination == destination,
                            isExpanded = isExpanded,
                            itemWidth = itemWidth,
                            onClick = { onDestinationSelected(destination) }
                        )
                        Spacer(modifier = Modifier.height(10.dp))
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
    itemWidth: Dp,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    // Smooth scaling spring physics
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.06f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioLowBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "itemScale"
    )

    // Smooth indicator dimensions spring physics
    val indicatorHeight by animateDpAsState(
        targetValue = if (isFocused) 24.dp else if (isSelected) 14.dp else 0.dp,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "indicatorHeight"
    )
    val indicatorWidth by animateDpAsState(
        targetValue = if (isFocused || isSelected) 4.dp else 0.dp,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "indicatorWidth"
    )
    val indicatorAlpha by animateFloatAsState(
        targetValue = if (isFocused || isSelected) 1f else 0f,
        label = "indicatorAlpha"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) Color.White.copy(alpha = 0.08f) else Color.Transparent,
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black,
            contentColor = if (isSelected) PrimaryRed else TextSecondary
        ),
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(16.dp)),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1f), // Controlled by graphicsLayer for performance
        modifier = Modifier
            .width(itemWidth)
            .height(48.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            // Elegant vertical Red Pill Indicator
            if (indicatorWidth > 0.dp) {
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(start = 6.dp)
                        .width(indicatorWidth)
                        .height(indicatorHeight)
                        .graphicsLayer { alpha = indicatorAlpha }
                        .background(
                            color = if (isFocused) PrimaryRed else PrimaryRed.copy(alpha = 0.8f),
                            shape = RoundedCornerShape(2.dp)
                        )
                )
            }

            if (isExpanded) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(modifier = Modifier.width(8.dp)) // Offset to clear the indicator nicely
                    Icon(
                        imageVector = destination.icon,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = if (isFocused) PrimaryRed else if (isSelected) PrimaryRed else LocalContentColor.current
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = destination.title,
                        maxLines = 1,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Medium,
                        color = if (isFocused) Color.Black else if (isSelected) Color.White else TextSecondary
                    )
                }
            } else {
                Icon(
                    imageVector = destination.icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = if (isFocused) PrimaryRed else if (isSelected) PrimaryRed else LocalContentColor.current
                )
            }
        }
    }
}
