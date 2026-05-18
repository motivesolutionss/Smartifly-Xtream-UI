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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
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
import com.smartifly.tv.data.warmup.CatalogWarmupState
import com.smartifly.tv.data.warmup.DomainWarmupProgress
import com.smartifly.tv.data.warmup.WarmupStatus
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
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

    val warmupState by warmupOrchestrator.state.collectAsState(initial = CatalogWarmupState())

    LaunchedEffect(Unit) {
        val previousStatus = activationManager.activationStatus.first()

        val id = if (deviceId.isEmpty() || deviceId == "unknown") {
            activationManager.ensureDeviceId()
        } else {
            deviceId
        }

        repository.registerDevice(id)

        val remoteStatusResult = repository.checkActivationStatusDetailed(id)
        val remoteStatus = remoteStatusResult.status

        val status = when {
            previousStatus == DeviceStatus.ACTIVATED && remoteStatus == DeviceStatus.PENDING -> DeviceStatus.ACTIVATED
            previousStatus == DeviceStatus.BLOCKED && remoteStatus == DeviceStatus.PENDING -> DeviceStatus.BLOCKED
            else -> remoteStatus
        }

        activationManager.updateStatus(status)

        if (status == DeviceStatus.ACTIVATED) {
            val warmupEnabled = BuildConfig.STARTUP_WARMUP_V2
            val warmupStartedAt = System.currentTimeMillis()
            if (warmupEnabled) {
                val warmupCompleted = withTimeoutOrNull(25_000L) {
                    warmupOrchestrator.runStartupWarmup()
                    true
                } ?: false
                val warmupDuration = System.currentTimeMillis() - warmupStartedAt
                val current = warmupOrchestrator.state.value
                TelemetryManager.trackEvent(
                    "startup_warmup_v2",
                    mapOf(
                        "completed" to warmupCompleted.toString(),
                        "duration_ms" to warmupDuration.toString(),
                        "live_status" to current.live.status.name,
                        "movies_status" to current.movies.status.name,
                        "series_status" to current.series.status.name
                    )
                )
            } else {
                TelemetryManager.trackEvent(
                    "startup_warmup_v2_skipped",
                    mapOf("reason" to "flag_disabled")
                )
            }
        }

        delay(1000)
        onInitializationComplete(status)
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
            WarmupDomainCard(label = "Movies", progress = warmupState.movies, noun = "Movies")
            Spacer(modifier = Modifier.height(10.dp))
            WarmupDomainCard(label = "Series", progress = warmupState.series, noun = "Series")
            Spacer(modifier = Modifier.height(10.dp))
            WarmupDomainCard(label = "Live", progress = warmupState.live, noun = "Channels")
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun WarmupDomainCard(
    label: String,
    progress: DomainWarmupProgress,
    noun: String
) {
    val pct = when (progress.status) {
        WarmupStatus.SUCCESS -> 100
        WarmupStatus.RUNNING -> progress.progressPct.coerceIn(1, 99)
        WarmupStatus.FAILED -> 0
        WarmupStatus.PARTIAL -> 100
        WarmupStatus.PENDING -> 0
    }
    val statusSuffix = when (progress.status) {
        WarmupStatus.SUCCESS -> "OK"
        WarmupStatus.RUNNING -> "..."
        WarmupStatus.FAILED -> "!"
        WarmupStatus.PARTIAL -> "~"
        WarmupStatus.PENDING -> "-"
    }

    Row(
        modifier = Modifier
            .width(620.dp)
            .background(Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
            .padding(horizontal = 18.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "${progress.itemsLoaded} $noun",
            color = Color.White.copy(alpha = 0.45f),
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "$pct% $statusSuffix",
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

