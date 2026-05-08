package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    val id: String,
    val name: String,
    val avatarSeed: Int,
    val isKidsProfile: Boolean = false,
    val pinRequired: Boolean = false,
    val pinHash: String? = null,
    val maxRating: String = "NC-17",
    val createdAt: Long = System.currentTimeMillis(),
)

@Serializable
data class ProfileSet(
    val profiles: List<UserProfile> = emptyList(),
    val activeProfileId: String? = null,
)
