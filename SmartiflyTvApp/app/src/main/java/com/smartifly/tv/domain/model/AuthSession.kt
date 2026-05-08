package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class AuthSession(
    val serverUrl: String,
    val portalId: String = "",
    val portalName: String = "",
    val username: String,
    val password: String,
    val expDate: String? = null,
    val maxConnections: Int = 1,
    val activeConnections: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
)
