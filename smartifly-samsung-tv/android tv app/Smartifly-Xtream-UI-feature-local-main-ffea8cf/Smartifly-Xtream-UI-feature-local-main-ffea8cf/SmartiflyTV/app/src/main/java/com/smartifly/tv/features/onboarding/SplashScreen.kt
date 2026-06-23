package com.smartifly.tv.features.onboarding

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.analytics.TelemetryManager
import com.smartifly.tv.data.onboarding.ActivationStateManager
import com.smartifly.tv.data.onboarding.DeviceStatus
import com.smartifly.tv.data.onboarding.OnboardingRepository
import com.smartifly.tv.data.warmup.CatalogWarmupOrchestrator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SplashScreen(
    deviceId: String,
    repository: OnboardingRepository,
    activationManager: ActivationStateManager,
    warmupOrchestrator: CatalogWarmupOrchestrator,
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

        val id = if (deviceId.isEmpty() || deviceId == "unknown") {
            activationManager.ensureDeviceId()
        } else {
            deviceId
        }

        val initialStatus = when (previousStatus) {
            DeviceStatus.ACTIVATED,
            DeviceStatus.BLOCKED,
            DeviceStatus.EXPIRED -> previousStatus
            else -> DeviceStatus.PENDING
        }

        if (initialStatus != previousStatus) {
            activationManager.updateStatus(initialStatus)
        }

        if (initialStatus == DeviceStatus.ACTIVATED) {
            val warmupEnabled = BuildConfig.STARTUP_WARMUP_V2
            TelemetryManager.trackEvent(
                "startup_warmup_v2_deferred",
                mapOf(
                    "enabled" to warmupEnabled.toString(),
                    "reason" to "moved_off_splash_critical_path"
                )
            )
        }

        launch(Dispatchers.IO) {
            runCatching { repository.registerDevice(id) }

            val remoteStatusResult = runCatching {
                withTimeoutOrNull(4000) {
                    repository.checkActivationStatusDetailed(id)
                }
            }.getOrNull()

            val resolvedRemoteStatus = remoteStatusResult?.status ?: return@launch
            val resolvedStatus = when {
                previousStatus == DeviceStatus.ACTIVATED && resolvedRemoteStatus == DeviceStatus.PENDING -> DeviceStatus.ACTIVATED
                previousStatus == DeviceStatus.BLOCKED && resolvedRemoteStatus == DeviceStatus.PENDING -> DeviceStatus.BLOCKED
                else -> resolvedRemoteStatus
            }

            if (resolvedStatus != initialStatus) {
                withContext(Dispatchers.Main) {
                    activationManager.updateStatus(resolvedStatus)
                }
            }
        }

        delay(450)
        onInitializationComplete(initialStatus)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F0F)),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .width(400.dp)
                .height(400.dp)
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
            com.smartifly.tv.ui.components.base.SmartiflyLoader(
                size = 90.dp,
                strokeWidth = 5.dp
            )

            Spacer(modifier = Modifier.height(34.dp))

            Text(
                text = "SMARTIFLY",
                style = TextStyle(
                    color = Color(0xFFE50914),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 6.sp
                ),
                modifier = Modifier.scale(alpha)
            )

            Text(
                text = "PREMIUM STREAMING ENGINE",
                style = TextStyle(
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 5.sp
                )
            )

            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Starting up...",
                color = Color.White.copy(alpha = 0.55f),
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 40.dp),
            contentAlignment = Alignment.BottomCenter
        ) {
            Text(
                text = "v2025.05 | STABLE BUILD",
                color = Color.White.copy(alpha = 0.2f),
                fontSize = 9.sp,
                letterSpacing = 3.sp
            )
        }
    }
}

