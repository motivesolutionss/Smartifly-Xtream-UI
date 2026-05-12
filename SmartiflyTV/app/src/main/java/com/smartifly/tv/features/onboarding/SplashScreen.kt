package com.smartifly.tv.features.onboarding

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.onboarding.OnboardingRepository
import com.smartifly.tv.data.onboarding.ActivationStateManager
import com.smartifly.tv.data.onboarding.DeviceStatus
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SplashScreen(
    deviceId: String,
    repository: OnboardingRepository,
    activationManager: ActivationStateManager,
    onInitializationComplete: (DeviceStatus) -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "loader")
    
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    LaunchedEffect(Unit) {
        val previousStatus = activationManager.activationStatus.first()

        // 1. Ensure Device ID exists (especially on fresh install)
        val id = if (deviceId.isEmpty() || deviceId == "unknown" || deviceId == "") {
            activationManager.ensureDeviceId()
        } else {
            deviceId
        }

        // 2. Silent Registration
        repository.registerDevice(id)
        
        // 3. Initial Status Check
        val remoteStatusResult = repository.checkActivationStatusDetailed(id)
        val remoteStatus = remoteStatusResult.status

        // Preserve existing local activation on transient backend/network failures.
        // Only downgrade when backend provides an explicit non-pending state.
        val status = when {
            previousStatus == DeviceStatus.ACTIVATED && remoteStatus == DeviceStatus.PENDING -> DeviceStatus.ACTIVATED
            previousStatus == DeviceStatus.BLOCKED && remoteStatus == DeviceStatus.PENDING -> DeviceStatus.BLOCKED
            else -> remoteStatus
        }
        
        // 4. Update local state
        activationManager.updateStatus(status)
        
        // 5. Artificial delay for "premium feel"
        delay(2500)
        
        onInitializationComplete(status)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F0F)), // Deep Cinematic Black
        contentAlignment = Alignment.Center
    ) {
        // Background Glow (Cinematic Red)
        Box(
            modifier = Modifier
                .size(400.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color(0xFFE50914).copy(alpha = 0.12f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Unified Smartifly Loader
            com.smartifly.tv.ui.components.base.SmartiflyLoader(
                size = 90.dp,
                strokeWidth = 5.dp
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Branding (Red & Bold)
            Text(
                text = "SMARTIFLY",
                style = androidx.compose.ui.text.TextStyle(
                    color = Color(0xFFE50914), // Signature Red
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 6.sp
                ),
                modifier = Modifier.scale(alpha)
            )
            
            Text(
                text = "PREMIUM STREAMING ENGINE",
                style = androidx.compose.ui.text.TextStyle(
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 5.sp
                )
            )
        }
        
        // Version info at bottom
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 40.dp),
            contentAlignment = Alignment.BottomCenter
        ) {
            Text(
                text = "v2025.05 • STABLE BUILD",
                color = Color.White.copy(alpha = 0.2f),
                fontSize = 9.sp,
                letterSpacing = 3.sp
            )
        }
    }
}
