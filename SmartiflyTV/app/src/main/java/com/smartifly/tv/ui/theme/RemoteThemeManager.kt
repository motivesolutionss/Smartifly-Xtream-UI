package com.smartifly.tv.ui.theme

import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

data class DynamicThemeConfig(
    val primaryColor: Color = Color(0xFFE50914),
    val secondaryColor: Color = Color(0xFF0D1117),
    val accentColor: Color = Color(0xFFFFFFFF),
    val logoUrl: String? = null
)

object RemoteThemeManager {
    private val _currentConfig = MutableStateFlow(DynamicThemeConfig())
    val currentConfig = _currentConfig.asStateFlow()

    fun updateTheme(
        primary: String,
        secondary: String,
        accent: String,
        logo: String?
    ) {
        try {
            _currentConfig.value = DynamicThemeConfig(
                primaryColor = Color(android.graphics.Color.parseColor(primary)),
                secondaryColor = Color(android.graphics.Color.parseColor(secondary)),
                accentColor = Color(android.graphics.Color.parseColor(accent)),
                logoUrl = logo
            )
        } catch (e: Exception) {
            // Fallback to default on parse error
        }
    }
    
    // In a real app, this would be called from a Repository after fetching from /theme
    fun fetchRemoteTheme() {
        // Simulation of network fetch
        // updateTheme("#00D1FF", "#080C14", "#FFFFFF", null)
    }
}
