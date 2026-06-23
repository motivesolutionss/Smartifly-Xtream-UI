package com.smartifly.tv.features.settings

import androidx.compose.animation.*
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.AccountBox
import androidx.compose.material.icons.rounded.Dns
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.tv.material3.*
import android.content.ClipData
import android.content.ClipboardManager
import android.widget.Toast
import android.provider.Settings
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.data.image.ImageHostPolicy
import com.smartifly.tv.data.image.ImageQualityMonitor
import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.performance.PerformanceKpiMonitor
import com.smartifly.tv.performance.PreloadBackpressure
import com.smartifly.tv.data.warmup.CatalogWarmupRuntime
import java.net.URI

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingsScreen() {
    var selectedCategory by remember { mutableStateOf("Personalization") }
    
    val categories = remember {
        listOf(
            CategoryItem("Personalization", Icons.Rounded.Palette),
            CategoryItem("Parental Controls", Icons.Rounded.Lock),
            CategoryItem("Account", Icons.Rounded.AccountBox),
            CategoryItem("Network & System", Icons.Rounded.Dns)
        )
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .padding(Dimensions.PaddingExtraLarge),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingLarge)
    ) {
        // Left Sidebar
        Column(
            modifier = Modifier
                .width(300.dp)
                .fillMaxHeight()
                .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(24.dp))
                .border(
                    width = 1.dp,
                    brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                        listOf(Color.White.copy(alpha = 0.08f), Color.White.copy(alpha = 0.01f))
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                .padding(vertical = Dimensions.PaddingExtraLarge, horizontal = Dimensions.PaddingMedium)
        ) {
            Text(
                text = "SETTINGS",
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = Dimensions.PaddingExtraLarge, start = 16.dp)
            )

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(Dimensions.PaddingSmall)
            ) {
                categories.forEach { item ->
                    val isSelected = selectedCategory == item.name
                    SidebarCategoryItem(
                        item = item,
                        isSelected = isSelected,
                        onClick = { selectedCategory = item.name }
                    )
                }
            }
        }

        // Right Content Area
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(24.dp))
                .border(
                    width = 1.dp,
                    brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                        listOf(Color.White.copy(alpha = 0.04f), Color.White.copy(alpha = 0.01f))
                    ),
                    shape = RoundedCornerShape(24.dp)
                )
                .padding(Dimensions.PaddingExtraLarge)
        ) {
            AnimatedContent(
                targetState = selectedCategory,
                transitionSpec = {
                    fadeIn() + slideInHorizontally { it / 2 } togetherWith fadeOut()
                },
                label = "settings_content"
            ) { category ->
                when (category) {
                    "Personalization" -> PersonalizationSettings()
                    "Parental Controls" -> ParentalControlsSettings()
                    "Account" -> AccountSettings()
                    "Network & System" -> NetworkSystemSettings()
                }
            }
        }
    }
}

data class CategoryItem(val name: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SidebarCategoryItem(
    item: CategoryItem,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.04f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "sidebar_scale"
    )

    val indicatorHeight by animateDpAsState(
        targetValue = if (isSelected) 24.dp else 0.dp,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "indicator_height"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) Color.White.copy(alpha = 0.08f) else Color.Transparent,
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(Dimensions.BorderRadiusMedium)),
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(indicatorHeight)
                    .background(PrimaryRed, shape = RoundedCornerShape(2.dp))
            )

            Spacer(modifier = Modifier.width(if (isSelected) 10.dp else 0.dp))

            Icon(
                imageVector = item.icon,
                contentDescription = null,
                tint = when {
                    isFocused -> Color.Black
                    isSelected -> PrimaryRed
                    else -> Color.White.copy(alpha = 0.5f)
                },
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Text(
                text = item.name,
                style = MaterialTheme.typography.titleMedium,
                color = when {
                    isFocused -> Color.Black
                    isSelected -> Color.White
                    else -> Color.White.copy(alpha = 0.6f)
                },
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PersonalizationSettings() {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "Appearance",
            style = MaterialTheme.typography.headlineLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        Text(
            text = "App Theme",
            style = MaterialTheme.typography.titleLarge,
            color = Color.White.copy(alpha = 0.7f),
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))

        DefaultThemeCard()
        
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        Text(
            text = "Language",
            style = MaterialTheme.typography.titleLarge,
            color = Color.White.copy(alpha = 0.7f),
            fontWeight = FontWeight.SemiBold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        
        Row(horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)) {
            LanguageButton(text = "English", isSelected = true)
            LanguageButton(text = "Spanish", isSelected = false)
            LanguageButton(text = "French", isSelected = false)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DefaultThemeCard() {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.05f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "theme_card_scale"
    )

    Surface(
        onClick = {},
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
        modifier = Modifier
            .width(240.dp)
            .height(130.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            },
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(androidx.compose.foundation.BorderStroke(2.dp, PrimaryRed.copy(alpha = 0.6f))),
            focusedBorder = Border(androidx.compose.foundation.BorderStroke(2.dp, PrimaryRed))
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(16.dp))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Icon(
                imageVector = Icons.Rounded.CheckCircle,
                contentDescription = "Active Theme",
                tint = PrimaryRed,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(12.dp)
                    .size(20.dp)
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(PrimaryRed, shape = CircleShape)
                        .border(2.dp, Color.White.copy(alpha = 0.2f), shape = CircleShape)
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Metallic Noir",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isFocused) Color.Black else Color.White,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "Active Default Theme",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isFocused) Color.Black.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.5f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ParentalControlsSettings() {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "Parental Controls",
            style = MaterialTheme.typography.headlineLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        SettingItem(title = "System PIN", value = "****", icon = SmartiflyIcons.Lock)
        SettingItem(title = "Adult Content Filter", value = "ON", icon = SmartiflyIcons.Info)
        SettingItem(title = "Purchase PIN", value = "OFF", icon = SmartiflyIcons.Check)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AccountSettings() {
    val context = LocalContext.current
    val deviceId = remember {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            ?.takeLast(8)
            ?.ifBlank { "Unavailable" }
            ?: "Unavailable"
    }
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            text = "Account",
            style = MaterialTheme.typography.headlineLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        SettingItem(title = "Current Plan", value = "From provider account", icon = SmartiflyIcons.Star)
        SettingItem(title = "Expiry Date", value = "Managed by operator", icon = SmartiflyIcons.Info)
        SettingItem(title = "Device ID", value = "TV-$deviceId", icon = SmartiflyIcons.Settings)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun NetworkSystemSettings() {
    var hostHealth by remember { mutableStateOf(ImageQualityMonitor.snapshot()) }
    var kpiSnapshot by remember { mutableStateOf(PerformanceKpiMonitor.snapshot()) }
    val context = LocalContext.current
    val sessionManager = remember(context) { SessionManager(context) }
    val xtreamCredentials by sessionManager.xtreamCredentialsFlow.collectAsState(initial = null)
    val apiHost = remember {
        runCatching { URI(BuildConfig.API_BASE_URL).host ?: "Unavailable" }.getOrElse { "Unavailable" }
    }
    val activePortalHost = remember(xtreamCredentials) {
        runCatching {
            val baseUrl = xtreamCredentials?.baseUrl ?: return@runCatching null
            URI(baseUrl).host?.lowercase()
        }.getOrNull()
    }
    val observedTopHost = remember(hostHealth) { hostHealth.firstOrNull()?.host }
    val activePartitionKey = activePortalHost ?: observedTopHost ?: "global"
    var hostPolicyLabel by remember { mutableStateOf("Default") }
    val warmupState by CatalogWarmupRuntime.state.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "Network & System",
            style = MaterialTheme.typography.headlineLarge,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        Text(
            text = "System Info",
            style = MaterialTheme.typography.titleLarge,
            color = PrimaryRed,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))

        SettingItem(title = "Connection", value = "Auto-detected", icon = SmartiflyIcons.Live)
        SettingItem(title = "API Host", value = apiHost, icon = SmartiflyIcons.Info)
        SettingItem(title = "Version", value = "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})", icon = SmartiflyIcons.Settings)

        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Provider Health (Runtime)",
                style = MaterialTheme.typography.titleLarge,
                color = PrimaryRed,
                fontWeight = FontWeight.Bold
            )
            DiagnosticsButton(
                text = "Refresh",
                onClick = {
                    hostHealth = ImageQualityMonitor.snapshot()
                    kpiSnapshot = PerformanceKpiMonitor.snapshot()
                }
            )
        }
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))

        if (hostHealth.isEmpty()) {
            Text(
                text = "No image host telemetry yet. Browse Home/Details first.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.5f),
                modifier = Modifier.padding(vertical = Dimensions.PaddingSmall)
            )
        } else {
            hostHealth.forEach { health ->
                SettingItem(
                    title = health.host,
                    value = "fail ${health.failureRatePercent}%  (${health.failures}/${health.total})",
                    icon = SmartiflyIcons.Info
                )
            }
        }

        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        Text(
            text = "Image Performance KPIs",
            style = MaterialTheme.typography.titleLarge,
            color = PrimaryRed,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        val pressure = PreloadBackpressure.snapshot()
        val activePressure = PreloadBackpressure.snapshot(activePartitionKey)
        SettingItem(
            title = "Image Success Rate",
            value = "${kpiSnapshot.imageSuccessRatePct}% (${kpiSnapshot.imageSamples} samples)",
            icon = SmartiflyIcons.Check,
            valueColor = when {
                kpiSnapshot.imageSuccessRatePct >= 92 -> Color(0xFF4CAF50)
                kpiSnapshot.imageSuccessRatePct >= 80 -> Color(0xFFFFC107)
                else -> Color(0xFFF44336)
            }
        )
        SettingItem(
            title = "Image Load Latency",
            value = "p50 ${kpiSnapshot.imageP50Ms}ms | p95 ${kpiSnapshot.imageP95Ms}ms",
            icon = SmartiflyIcons.Info,
            valueColor = when {
                kpiSnapshot.imageP95Ms in 1..900L -> Color(0xFF4CAF50)
                kpiSnapshot.imageP95Ms in 901..1700L -> Color(0xFFFFC107)
                else -> Color(0xFFF44336)
            }
        )
        kpiSnapshot.imageByContext
            .filter {
                it.context == com.smartifly.tv.data.image.ImageQualityMonitor.Context.HOME_HERO ||
                    it.context == com.smartifly.tv.data.image.ImageQualityMonitor.Context.HOME_POSTER ||
                    it.context == com.smartifly.tv.data.image.ImageQualityMonitor.Context.CONTINUE_WATCHING ||
                    it.context == com.smartifly.tv.data.image.ImageQualityMonitor.Context.LIVE_CARD
            }
            .forEach { contextKpi ->
                SettingItem(
                    title = "Image ${contextKpi.context}",
                    value = "p50 ${contextKpi.p50Ms}ms | p95 ${contextKpi.p95Ms}ms | ok ${contextKpi.successRatePct}% (${contextKpi.samples})",
                    icon = SmartiflyIcons.Info,
                    valueColor = when {
                        contextKpi.successRatePct >= 95 && contextKpi.p95Ms in 1..900L -> Color(0xFF4CAF50)
                        contextKpi.successRatePct >= 85 && contextKpi.p95Ms in 901..1700L -> Color(0xFFFFC107)
                        else -> Color(0xFFF44336)
                    }
                )
            }
        SettingItem(
            title = "Prefetch Health",
            value = "avg ${kpiSnapshot.prefetchAvgBatchMs}ms | fail ${kpiSnapshot.prefetchAvgFailRatePct}% (${kpiSnapshot.prefetchSamples} batches)",
            icon = SmartiflyIcons.Live,
            valueColor = when {
                kpiSnapshot.prefetchAvgFailRatePct <= 18 -> Color(0xFF4CAF50)
                kpiSnapshot.prefetchAvgFailRatePct <= 35 -> Color(0xFFFFC107)
                else -> Color(0xFFF44336)
            }
        )
        SettingItem(
            title = "Preload Backpressure",
            value = "${pressure.mode} | fail ${(pressure.failRate * 100).toInt()}% | item ${pressure.avgDurationMs}ms",
            icon = SmartiflyIcons.Settings,
            valueColor = if (pressure.mode == com.smartifly.tv.performance.PreloadBackpressure.Mode.NORMAL) {
                Color(0xFF4CAF50)
            } else {
                Color(0xFFFFC107)
            }
        )
        SettingItem(
            title = "Prefetch Runtime Diagnostics",
            value = "mode=${pressure.mode} ewma_fail=${(pressure.failRate * 100).toInt()}% ewma_item=${pressure.avgDurationMs}ms enterHits=${pressure.constrainedHits} exitHits=${pressure.normalHits}",
            icon = SmartiflyIcons.Info,
            valueColor = if (pressure.mode == com.smartifly.tv.performance.PreloadBackpressure.Mode.NORMAL) {
                Color(0xFF4CAF50)
            } else {
                Color(0xFFFFC107)
            }
        )
        SettingItem(
            title = "Active Host Partition",
            value = activePartitionKey,
            icon = SmartiflyIcons.Live
        )
        SettingItem(
            title = "Partition Backpressure",
            value = "${activePressure.mode} | fail ${(activePressure.failRate * 100).toInt()}% | item ${activePressure.avgDurationMs}ms",
            icon = SmartiflyIcons.Settings,
            valueColor = if (activePressure.mode == com.smartifly.tv.performance.PreloadBackpressure.Mode.NORMAL) {
                Color(0xFF4CAF50)
            } else {
                Color(0xFFFFC107)
            }
        )
        SettingItem(
            title = "Partition Diagnostics",
            value = "mode=${activePressure.mode} ewma_fail=${(activePressure.failRate * 100).toInt()}% ewma_item=${activePressure.avgDurationMs}ms enterHits=${activePressure.constrainedHits} exitHits=${activePressure.normalHits}",
            icon = SmartiflyIcons.Info,
            valueColor = if (activePressure.mode == com.smartifly.tv.performance.PreloadBackpressure.Mode.NORMAL) {
                Color(0xFF4CAF50)
            } else {
                Color(0xFFFFC107)
            }
        )
        
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        
        DiagnosticsButton(
            text = "Copy Diagnostics",
            onClick = {
                val line = buildString {
                    append("prefetch_diag")
                    append(" active_partition=").append(activePartitionKey)
                    append(" global_mode=").append(pressure.mode)
                    append(" global_fail_pct=").append((pressure.failRate * 100).toInt())
                    append(" global_item_ms=").append(pressure.avgDurationMs)
                    append(" global_enter_hits=").append(pressure.constrainedHits)
                    append(" global_exit_hits=").append(pressure.normalHits)
                    append(" partition_mode=").append(activePressure.mode)
                    append(" partition_fail_pct=").append((activePressure.failRate * 100).toInt())
                    append(" partition_item_ms=").append(activePressure.avgDurationMs)
                    append(" partition_enter_hits=").append(activePressure.constrainedHits)
                    append(" partition_exit_hits=").append(activePressure.normalHits)
                    append(" prefetch_avg_batch_ms=").append(kpiSnapshot.prefetchAvgBatchMs)
                    append(" prefetch_avg_fail_pct=").append(kpiSnapshot.prefetchAvgFailRatePct)
                    append(" prefetch_samples=").append(kpiSnapshot.prefetchSamples)
                    append(" image_success_pct=").append(kpiSnapshot.imageSuccessRatePct)
                    append(" image_p95_ms=").append(kpiSnapshot.imageP95Ms)
                }
                val clipboard = context.getSystemService(ClipboardManager::class.java)
                clipboard?.setPrimaryClip(ClipData.newPlainText("prefetch_diagnostics", line))
                android.util.Log.i("SmartiflyPrefetchDiag", line)
                Toast.makeText(context, "Diagnostics copied", Toast.LENGTH_SHORT).show()
            }
        )

        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        Text(
            text = "Startup Warmup (Debug)",
            style = MaterialTheme.typography.titleLarge,
            color = PrimaryRed,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        
        SettingItem(
            title = "Live Warmup",
            value = "${warmupState.live.status} | ${warmupState.live.itemsLoaded} items | ${warmupState.live.durationMs}ms",
            icon = SmartiflyIcons.Live
        )
        SettingItem(
            title = "Movies Warmup",
            value = "${warmupState.movies.status} | ${warmupState.movies.itemsLoaded} items | ${warmupState.movies.durationMs}ms",
            icon = SmartiflyIcons.Star
        )
        SettingItem(
            title = "Series Warmup",
            value = "${warmupState.series.status} | ${warmupState.series.itemsLoaded} items | ${warmupState.series.durationMs}ms",
            icon = SmartiflyIcons.Info
        )

        if (BuildConfig.DEBUG) {
            Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
            Text(
                text = "Image Host Policy (Debug)",
                style = MaterialTheme.typography.titleLarge,
                color = PrimaryRed,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(Dimensions.PaddingSmall))
            Text(
                text = "Current: $hostPolicyLabel",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.7f)
            )
            Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
            Row(horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)) {
                DiagnosticsButton(
                    text = "Default",
                    onClick = {
                        ImageHostPolicy.overrideLowTrustHosts(context, "starshare.live,webhop.live")
                        hostPolicyLabel = "Default"
                    }
                )

                DiagnosticsButton(
                    text = "Strict",
                    onClick = {
                        ImageHostPolicy.overrideLowTrustHosts(
                            context,
                            "starshare.live,webhop.live,encrypted-tbn0.gstatic.com,imdb.com,www.imdb.com"
                        )
                        hostPolicyLabel = "Strict"
                    }
                )

                DiagnosticsButton(
                    text = "Allow Starshare",
                    onClick = {
                        ImageHostPolicy.overrideLowTrustHosts(context, "webhop.live")
                        hostPolicyLabel = "Allow Starshare"
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingItem(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    valueColor: Color = Color.White.copy(alpha = 0.6f)
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.02f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "setting_item_scale"
    )

    Surface(
        onClick = {},
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.04f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(12.dp)),
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .border(
                width = 1.dp,
                color = if (isFocused) Color.White else Color.White.copy(alpha = 0.05f),
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isFocused) Color.Black else PrimaryRed,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = if (isFocused) Color.Black else Color.White
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (isFocused) Color.Black.copy(alpha = 0.7f) else valueColor
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LanguageButton(text: String, isSelected: Boolean) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.08f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "lang_scale"
    )

    Surface(
        onClick = {},
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) PrimaryRed else Color.White.copy(alpha = 0.05f),
            contentColor = if (isSelected) Color.White else Color.White.copy(alpha = 0.7f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(20.dp)),
        modifier = Modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .border(
                width = 1.5.dp,
                color = if (isFocused) Color.White else if (isSelected) PrimaryRed else Color.Transparent,
                shape = RoundedCornerShape(20.dp)
            )
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DiagnosticsButton(
    text: String,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.05f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "diag_btn_scale"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.08f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        modifier = Modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .border(
                width = 1.dp,
                color = if (isFocused) PrimaryRed else Color.White.copy(alpha = 0.1f),
                shape = RoundedCornerShape(8.dp)
            )
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = if (isFocused) Color.Black else Color.White
            )
        }
    }
}
