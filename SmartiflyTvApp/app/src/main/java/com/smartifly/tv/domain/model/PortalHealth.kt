package com.smartifly.tv.domain.model

enum class PortalHealthStatus {
    UNKNOWN,
    CHECKING,
    ONLINE,
    OFFLINE,
}

data class PortalHealth(
    val status: PortalHealthStatus = PortalHealthStatus.UNKNOWN,
    val latencyMs: Long? = null,
)
