package com.smartifly.tv.data.models

data class UserProfile(
    val id: String,
    val name: String,
    val avatarUrl: String,
    val pin: String? = null,
    val isLocked: Boolean = false,
    val primaryColor: String? = null // Hex color string for theme injection
)
