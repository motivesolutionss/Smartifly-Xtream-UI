package com.smartifly.tv.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

import androidx.compose.material3.Icon
import androidx.compose.ui.draw.clip
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig

import com.smartifly.tv.ui.components.base.AppIconButton

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerControls(
    isVisible: Boolean,
    title: String,
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    onSeekForward: () -> Unit,
    onSeekBackward: () -> Unit,
    onBack: () -> Unit,
    onSettingsClick: () -> Unit,
    progress: Float,
    currentTime: String,
    duration: String,
    modifier: Modifier = Modifier
) {
    
    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier.fillMaxSize()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.8f), Color.Transparent, Color.Transparent, Color.Black.copy(alpha = 0.95f))))
        ) {
            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth().padding(Dimensions.PaddingExtraLarge),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AppIconButton(onClick = onBack) {
                    Icon(SmartiflyIcons.Back, contentDescription = "Back", tint = Color.White)
                }
                Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                Text(text = title, style = MaterialTheme.typography.headlineMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.weight(1f))
                AppIconButton(onClick = onSettingsClick) {
                    Icon(SmartiflyIcons.Settings, contentDescription = "Settings", tint = Color.White)
                }
            }

            // Bottom Controls Area
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(Dimensions.PaddingExtraLarge)
            ) {
                // Seek Bar
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = currentTime, color = TextSecondary, style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(Dimensions.ProgressBarHeight)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progress)
                                .height(Dimensions.ProgressBarHeight)
                                .background(PrimaryRed)
                        )
                    }
                    Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                    Text(text = duration, color = TextSecondary, style = MaterialTheme.typography.labelMedium)
                }
                
                Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
                
                // Playback Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AppIconButton(onClick = onSeekBackward) {
                        Icon(SmartiflyIcons.FastRewind, contentDescription = "-10s", modifier = Modifier.size(Dimensions.PlayerIconSizeMedium), tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(Dimensions.PaddingExtraLarge))
                    
                    Button(
                        onClick = onPlayPause,
                        modifier = Modifier.size(Dimensions.PlayerControlSizeLarge),
                        colors = ButtonDefaults.colors(
                            containerColor = PrimaryRed,
                            focusedContainerColor = Color.White,
                            focusedContentColor = Color.Black
                        )
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(
                                if (isPlaying) SmartiflyIcons.Pause else SmartiflyIcons.Play,
                                contentDescription = "Play/Pause",
                                modifier = Modifier.size(Dimensions.PlayerIconSizeLarge)
                            )
                        }
                    } 
                    
                    Spacer(modifier = Modifier.width(Dimensions.PaddingExtraLarge))
                    AppIconButton(onClick = onSeekForward) {
                        Icon(SmartiflyIcons.FastForward, contentDescription = "+10s", modifier = Modifier.size(Dimensions.PlayerIconSizeMedium), tint = Color.White)
                    }
                }
            }
        }
    }
}

