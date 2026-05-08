package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class SavedAccount(
    val id: String,
    val username: String,
    val password: String,
    val portal: Portal,
    val expDate: String? = null,
    val maxConnections: Int = 1,
    val activeConnections: Int = 0,
    val lastActive: Long = System.currentTimeMillis(),
)
