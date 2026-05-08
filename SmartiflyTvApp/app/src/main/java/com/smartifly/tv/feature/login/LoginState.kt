package com.smartifly.tv.feature.login

import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.PortalHealth
import com.smartifly.tv.domain.model.PortalHealthStatus

enum class ActiveField {
    USERNAME,
    PASSWORD,
}

data class LoginState(
    val portals: List<Portal> = emptyList(),
    val portalHealth: Map<String, PortalHealth> = emptyMap(),
    val selectedPortalId: String? = null,
    val username: String = "",
    val password: String = "",
    val activeField: ActiveField = ActiveField.USERNAME,
    val isLoadingPortals: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
) {
    val selectedPortal: Portal?
        get() = portals.firstOrNull { it.id == selectedPortalId }

    val selectedPortalHealth: PortalHealth
        get() = selectedPortalId?.let { portalHealth[it] } ?: PortalHealth()

    val canSubmitSelectedPortal: Boolean
        get() = selectedPortal != null && selectedPortalHealth.status != PortalHealthStatus.CHECKING

    val hasOnlinePortal: Boolean
        get() = portals.any { portal ->
            portalHealth[portal.id]?.status == PortalHealthStatus.ONLINE
        }

    val isCheckingPortals: Boolean
        get() = portals.isNotEmpty() && portals.any { portal ->
            portalHealth[portal.id]?.status == PortalHealthStatus.CHECKING
        }

    val areAllPortalsUnavailable: Boolean
        get() = portals.isNotEmpty() &&
            !isCheckingPortals &&
            !hasOnlinePortal
}
