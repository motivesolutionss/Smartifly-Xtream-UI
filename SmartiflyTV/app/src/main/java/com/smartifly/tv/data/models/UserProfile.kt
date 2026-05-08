package com.smartifly.tv.data.models

data class UserProfile(
    val id: String,
    val name: String,
    val avatarUrl: String,
    val isKids: Boolean = false
)
