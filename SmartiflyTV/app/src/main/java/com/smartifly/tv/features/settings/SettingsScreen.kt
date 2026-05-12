package com.smartifly.tv.features.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Icon
import androidx.tv.material3.*

import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.ThemeMode
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.PrimaryGold
import com.smartifly.tv.ui.theme.PrimaryCyan
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

import androidx.compose.animation.*
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.data.image.ImageQualityMonitor

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingsScreen(
    currentTheme: ThemeMode,
    onThemeChanged: (ThemeMode) -> Unit
) {
    var selectedCategory by remember { mutableStateOf("Personalization") }
    val categories = listOf("Personalization", "Parental Controls", "Account", "Network & System")

    Row(modifier = Modifier.fillMaxSize()) {
        // Left Sidebar
        Column(
            modifier = Modifier
                .width(300.dp)
                .fillMaxHeight()
                .padding(Dimensions.PaddingExtraLarge)
                .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(Dimensions.BorderRadiusLarge))
        ) {
            Text(
                text = "SETTINGS",
                style = MaterialTheme.typography.headlineLarge,
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = Dimensions.PaddingExtraLarge)
            )

            categories.forEach { category ->
                val isSelected = selectedCategory == category
                Surface(
                    onClick = { selectedCategory = category },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = Dimensions.PaddingSmall),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = if (isSelected) Color.White.copy(alpha = 0.1f) else Color.Transparent,
                        focusedContainerColor = Color.White,
                        focusedContentColor = Color.Black
                    ),
                    shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(Dimensions.BorderRadiusMedium))
                ) {
                    Text(
                        text = category,
                        modifier = Modifier.padding(Dimensions.PaddingMedium),
                        style = MaterialTheme.typography.titleMedium,
                        color = if (isSelected) Color.White else TextSecondary,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }

        // Right Content Area
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(Dimensions.PaddingExtraLarge)
        ) {
            AnimatedContent(
                targetState = selectedCategory,
                transitionSpec = {
                    fadeIn() + slideInHorizontally { it / 2 } togetherWith fadeOut()
                }
            ) { category ->
                when (category) {
                    "Personalization" -> PersonalizationSettings(currentTheme, onThemeChanged)
                    "Parental Controls" -> ParentalControlsSettings()
                    "Account" -> AccountSettings()
                    "Network & System" -> NetworkSystemSettings()
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PersonalizationSettings(currentTheme: ThemeMode, onThemeChanged: (ThemeMode) -> Unit) {
    Column {
        Text(text = "Appearance", style = MaterialTheme.typography.displaySmall, color = TextPrimary)
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        Text(text = "Active Theme", style = MaterialTheme.typography.titleLarge, color = TextSecondary)
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        
        Row(horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)) {
            ThemeCard(
                title = "Metallic Noir",
                color = PrimaryRed,
                isSelected = currentTheme == ThemeMode.Metallic,
                onClick = { onThemeChanged(ThemeMode.Metallic) }
            )
            ThemeCard(
                title = "Midnight Gold",
                color = PrimaryGold,
                isSelected = currentTheme == ThemeMode.Gold,
                onClick = { onThemeChanged(ThemeMode.Gold) }
            )
            ThemeCard(
                title = "Aether",
                color = PrimaryCyan,
                isSelected = currentTheme == ThemeMode.Aether,
                onClick = { onThemeChanged(ThemeMode.Aether) }
            )
        }
        
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        Text(text = "Language", style = MaterialTheme.typography.titleLarge, color = TextSecondary)
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
fun ParentalControlsSettings() {
    Column {
        Text(text = "Parental Controls", style = MaterialTheme.typography.displaySmall, color = TextPrimary)
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        SettingItem(title = "System PIN", value = "****", icon = SmartiflyIcons.Lock)
        SettingItem(title = "Adult Content Filter", value = "ON", icon = SmartiflyIcons.Info)
        SettingItem(title = "Purchase PIN", value = "OFF", icon = SmartiflyIcons.Check)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AccountSettings() {
    Column {
        Text(text = "Account", style = MaterialTheme.typography.displaySmall, color = TextPrimary)
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        SettingItem(title = "Current Plan", value = "Enterprise Elite", icon = SmartiflyIcons.Star)
        SettingItem(title = "Expiry Date", value = "Dec 2026", icon = SmartiflyIcons.Info)
        SettingItem(title = "Device ID", value = "SF-4492-XT", icon = SmartiflyIcons.Settings)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun NetworkSystemSettings() {
    var hostHealth by remember { mutableStateOf(ImageQualityMonitor.snapshot()) }

    Column {
        Text(text = "Network & System", style = MaterialTheme.typography.displaySmall, color = TextPrimary)
        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        
        SettingItem(title = "Connection", value = "Fiber - 500Mbps", icon = SmartiflyIcons.Live)
        SettingItem(title = "IP Address", value = "192.168.1.45", icon = SmartiflyIcons.Info)
        SettingItem(title = "Version", value = "1.0.2-Stable", icon = SmartiflyIcons.Settings)

        Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Provider Health (Runtime)",
                style = MaterialTheme.typography.titleLarge,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
            Button(
                onClick = { hostHealth = ImageQualityMonitor.snapshot() },
                colors = ButtonDefaults.colors(
                    containerColor = Color.White.copy(alpha = 0.1f),
                    focusedContainerColor = Color.White,
                    focusedContentColor = Color.Black
                )
            ) {
                Text("Refresh")
            }
        }
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))

        if (hostHealth.isEmpty()) {
            Text(
                text = "No image host telemetry yet. Browse Home/Details first.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
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
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingItem(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Surface(
        onClick = {},
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Dimensions.PaddingSmall),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(Dimensions.BorderRadiusMedium))
    ) {
        Row(
            modifier = Modifier.padding(Dimensions.PaddingMedium),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.weight(1f))
            Text(text = value, style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LanguageButton(text: String, isSelected: Boolean) {
    Button(
        onClick = {},
        colors = ButtonDefaults.colors(
            containerColor = if (isSelected) PrimaryRed else Color.White.copy(alpha = 0.05f),
            contentColor = if (isSelected) Color.White else TextPrimary
        )
    ) {
        Text(text = text)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ThemeCard(
    title: String,
    color: Color,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.width(180.dp).height(120.dp),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(androidx.compose.foundation.BorderStroke(2.dp, if (isSelected) color else Color.Transparent)),
            focusedBorder = Border(androidx.compose.foundation.BorderStroke(2.dp, color))
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(Dimensions.BorderRadiusMedium))
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(modifier = Modifier.size(32.dp).background(color, shape = androidx.compose.foundation.shape.CircleShape))
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}
