package com.smartifly.tv.data.remote

import retrofit2.http.GET
import retrofit2.http.Query

interface BackendApiService {
    @GET("portals")
    suspend fun getPortals(): List<PortalDto>

    @GET("announcements")
    suspend fun getAnnouncements(): List<MasterAnnouncementDto>

    @GET("apps/check-update")
    suspend fun checkUpdate(
        @Query("name") name: String,
        @Query("version") version: String,
        @Query("platform") platform: String
    ): AppUpdateDto
}
