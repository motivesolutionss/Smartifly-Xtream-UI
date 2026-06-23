package com.smartifly.tv.ui.components.navigation

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDropDown
import com.smartifly.tv.navigation.Destination
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.features.profiles.ProfileAvatar
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.ui.theme.fromHex
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TopNav(
    selectedDestination: Destination,
    onDestinationSelected: (Destination) -> Unit,
    contentFocusRequester: FocusRequester? = null,
    navFocusRequester: FocusRequester? = null,
    profileColor: Color? = null,
    profiles: List<UserProfile> = emptyList(),
    selectedProfile: UserProfile? = null,
    onProfileSelected: ((UserProfile) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val navItems = remember {
        listOf(
            Destination.Home,
            Destination.Series,
            Destination.Movies,
            Destination.Live,
            Destination.Watchlist,
            Destination.Search,
            Destination.Settings
        )
    }

    // Time & Network status states
    val timeLabel by produceState(initialValue = currentTimeLabel()) {
        while (true) {
            value = currentTimeLabel()
            delay(1000L)
        }
    }
    val isOnline by produceState(initialValue = isDeviceOnline(context)) {
        while (true) {
            value = isDeviceOnline(context)
            delay(10_000L)
        }
    }
    val infiniteTransition = rememberInfiniteTransition(label = "wifiPulse")
    val wifiAlpha by infiniteTransition.animateFloat(
        initialValue = 0.42f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "wifiPulseAlpha"
    )

    var isDropdownExpanded by remember { mutableStateOf(false) }
    val triggerInteractionSource = remember { MutableInteractionSource() }
    val isTriggerFocused by triggerInteractionSource.collectIsFocusedAsState()
    
    val triggerScale by animateFloatAsState(
        targetValue = 1.0f,
        animationSpec = tween(180),
        label = "profile_trigger_scale"
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 24.dp, top = 8.dp, bottom = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left Side: Interactive Netflix-Style Profile Switcher Dropdown (Icon Only)
        Box(modifier = Modifier.wrapContentSize()) {
            Button(
                onClick = { isDropdownExpanded = !isDropdownExpanded },
                interactionSource = triggerInteractionSource,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp, vertical = 4.dp),
                shape = ButtonDefaults.shape(RoundedCornerShape(10.dp)),
                colors = ButtonDefaults.colors(
                    containerColor = Color.Transparent,
                    contentColor = Color.White,
                    focusedContainerColor = Color.Transparent,
                    focusedContentColor = Color.White
                ),
                scale = ButtonDefaults.scale(focusedScale = 1f),
                modifier = Modifier
                    .graphicsLayer {
                        scaleX = triggerScale
                        scaleY = triggerScale
                    }
                    .dpadDownFocus(contentFocusRequester)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Box(
                        modifier = Modifier
                        .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(
                                width = if (isTriggerFocused) 2.dp else 1.dp,
                                color = if (isTriggerFocused) Color.White else Color.White.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(8.dp)
                            )
                    ) {
                        if (selectedProfile != null) {
                            ProfileAvatar(
                                profile = selectedProfile,
                                isFocused = isTriggerFocused,
                                paddingDp = 6.dp,
                                cornerRadiusDp = 8.dp,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                    Icon(
                        imageVector = Icons.Rounded.ArrowDropDown,
                        contentDescription = null,
                        tint = if (isTriggerFocused) Color.White else Color.White.copy(alpha = 0.7f),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            // Glassmorphic Custom TV Dropdown Menu overlay
            DropdownMenu(
                expanded = isDropdownExpanded,
                onDismissRequest = { isDropdownExpanded = false },
                shape = RoundedCornerShape(16.dp),
                containerColor = Color(0xFF0F0F11).copy(alpha = 0.96f),
                modifier = Modifier
                    .border(
                        width = 1.dp,
                        color = Color.White.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(16.dp)
                    )
                    .width(220.dp)
                    .padding(6.dp) // Professional inner padding to avoid edge hugging
            ) {
                    Text(
                        text = "Switch Profile",
                        color = Color.White.copy(alpha = 0.4f),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )

                    profiles.forEach { profile ->
                        val isCurrent = profile.id == selectedProfile?.id
                        val interactionSource = remember { MutableInteractionSource() }
                        val isFocused by interactionSource.collectIsFocusedAsState()
                        
                        Button(
                            onClick = {
                                isDropdownExpanded = false
                                onProfileSelected?.invoke(profile)
                            },
                            interactionSource = interactionSource,
                            colors = ButtonDefaults.colors(
                                containerColor = if (isCurrent) Color.White.copy(alpha = 0.06f) else Color.Transparent,
                                contentColor = Color.White,
                                focusedContainerColor = Color.White.copy(alpha = 0.12f),
                                focusedContentColor = Color.White
                            ),
                            border = ButtonDefaults.border(
                                border = Border(BorderStroke(1.dp, Color.Transparent), shape = RoundedCornerShape(10.dp)),
                                focusedBorder = Border(BorderStroke(2.dp, Color.White), shape = RoundedCornerShape(10.dp))
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(10.dp)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(26.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                    ) {
                                        ProfileAvatar(
                                            profile = profile,
                                            isFocused = isFocused, // React dynamically to focus!
                                            paddingDp = 4.dp,
                                            cornerRadiusDp = 6.dp,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = profile.name,
                                        fontSize = 13.sp,
                                        fontWeight = if (isCurrent || isFocused) FontWeight.Bold else FontWeight.Medium
                                    )
                                }
                                if (isCurrent) {
                                    Icon(
                                        imageVector = SmartiflyIcons.Check,
                                        contentDescription = null,
                                        tint = if (isFocused) Color.White else Color.White.copy(alpha = 0.8f),
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        }
                    }

                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 6.dp, horizontal = 12.dp),
                        color = Color.White.copy(alpha = 0.08f),
                        thickness = 1.dp
                    )

                    // Settings Item inside Dropdown
                    val settingsInteractionSource = remember { MutableInteractionSource() }
                    val isSettingsFocused by settingsInteractionSource.collectIsFocusedAsState()

                    Button(
                        onClick = {
                            isDropdownExpanded = false
                            onDestinationSelected(Destination.Settings)
                        },
                        interactionSource = settingsInteractionSource,
                        colors = ButtonDefaults.colors(
                            containerColor = Color.Transparent,
                            contentColor = Color.White,
                            focusedContainerColor = Color.White.copy(alpha = 0.12f),
                            focusedContentColor = Color.White
                        ),
                        border = ButtonDefaults.border(
                            border = Border(BorderStroke(1.dp, Color.Transparent), shape = RoundedCornerShape(10.dp)),
                            focusedBorder = Border(BorderStroke(2.dp, Color.White), shape = RoundedCornerShape(10.dp))
                        ),
                        shape = ButtonDefaults.shape(RoundedCornerShape(10.dp)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = SmartiflyIcons.Settings,
                                contentDescription = null,
                                tint = if (isSettingsFocused) Color.White else Color.White.copy(alpha = 0.7f),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Settings",
                                fontSize = 13.sp,
                                fontWeight = if (isSettingsFocused) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }
            }

        // Center: Glassmorphic Capsule & Navigation Center
        Row(
            modifier = Modifier
                .background(
                    color = Color(0xFF0C0C0E).copy(alpha = 0.62f),
                    shape = RoundedCornerShape(24.dp)
                )
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.08f),
                    shape = RoundedCornerShape(24.dp)
                )
                .padding(horizontal = 6.dp, vertical = 5.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            navItems.forEachIndexed { index, destination ->
                val isSelected = destination == selectedDestination
                val interactionSource = remember { MutableInteractionSource() }
                val isFocused by interactionSource.collectIsFocusedAsState()

                val tabScale by animateFloatAsState(
                    targetValue = 1f,
                    animationSpec = tween(180),
                    label = "top_nav_scale_$index"
                )
                val textColor by animateColorAsState(
                    targetValue = when {
                        isFocused -> Color.Black
                        isSelected -> Color.White
                        else -> Color.White.copy(alpha = 0.65f)
                    },
                    animationSpec = tween(180),
                    label = "top_nav_text_$index"
                )
                val containerColor = when {
                    isFocused -> Color.White
                    isSelected -> Color.White.copy(alpha = 0.12f)
                    else -> Color.Transparent
                }

                Button(
                    onClick = { onDestinationSelected(destination) },
                    interactionSource = interactionSource,
                    shape = ButtonDefaults.shape(RoundedCornerShape(18.dp)),
                    colors = ButtonDefaults.colors(
                        containerColor = containerColor,
                        contentColor = textColor,
                        focusedContainerColor = Color.White,
                        focusedContentColor = Color.Black
                    ),
                    scale = ButtonDefaults.scale(focusedScale = 1f),
                    modifier = Modifier
                        .graphicsLayer {
                            scaleX = tabScale
                            scaleY = tabScale
                        }
                        .then(
                            if (index == 0 && navFocusRequester != null) {
                                Modifier.focusRequester(navFocusRequester)
                            } else {
                                Modifier
                            }
                        )
                        .dpadDownFocus(contentFocusRequester)
                ) {
                    Text(
                        text = destination.title,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.3.sp,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                }
            }
        }

        // Right: System Status & Diagnostic Center (No Profile icon here anymore)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Live clock text
            Text(
                text = timeLabel,
                color = Color.White.copy(alpha = 0.88f),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.5.sp
            )

            // Diagnostic Wifi icon with continuous breathing glow
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(14.dp))
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isOnline) SmartiflyIcons.Wifi else SmartiflyIcons.WifiOff,
                    contentDescription = null,
                    tint = if (isOnline) Color(0xFF00FF66).copy(alpha = wifiAlpha) else Color(0xFFFF3838),
                    modifier = Modifier.size(13.dp)
                )
            }
        }
    }
}

private fun currentTimeLabel(): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())

private fun isDeviceOnline(context: android.content.Context): Boolean {
    val manager = context.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager ?: return false
    val network = manager.activeNetwork ?: return false
    val capabilities = manager.getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
}

private fun Modifier.dpadDownFocus(contentFocusRequester: FocusRequester?): Modifier = this.then(
    if (contentFocusRequester != null) {
        Modifier.onPreviewKeyEvent { keyEvent ->
            if (keyEvent.key == Key.DirectionDown && keyEvent.type == KeyEventType.KeyDown) {
                runCatching {
                    contentFocusRequester.requestFocus()
                }.isSuccess
            } else {
                false
            }
        }
    } else {
        Modifier
    }
)
