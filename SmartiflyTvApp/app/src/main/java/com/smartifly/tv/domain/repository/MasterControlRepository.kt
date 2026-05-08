package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.BootAccessState

interface MasterControlRepository {
    suspend fun verifyStartupAccess(): BootAccessState
    suspend fun reportLogin(serverUrl: String, username: String, password: String)
    suspend fun getRemoteAnnouncements(): List<com.smartifly.tv.data.remote.MasterBroadcastDto>
    suspend fun checkAppUpdate(): com.smartifly.tv.data.remote.UpdateResponseDto?
}
