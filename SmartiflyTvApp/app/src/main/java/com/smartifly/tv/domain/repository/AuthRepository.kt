package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.PortalHealth
import com.smartifly.tv.domain.model.SavedAccount
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val sessionFlow: Flow<AuthSession?>
    val cachedPortalsFlow: Flow<List<Portal>>
    val selectedPortalIdFlow: Flow<String?>
    val savedAccountsFlow: Flow<List<SavedAccount>>

    suspend fun fetchPortals(forceRefresh: Boolean = true): List<Portal>
    suspend fun probePortalHealth(portal: Portal): PortalHealth
    suspend fun login(portal: Portal, username: String, password: String): Result<AuthSession>
    suspend fun checkLicense(deviceId: String): Result<Unit>
    suspend fun setSelectedPortal(portalId: String)
    suspend fun switchAccount(accountId: String): Result<AuthSession>
    suspend fun removeAccount(accountId: String)
    suspend fun logout()
}
