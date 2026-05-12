package com.smartifly.tv.data.remote

import com.smartifly.tv.data.remote.dto.*
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Body
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.QueryMap

/**
 * Smartifly TV API Interface
 * Aligned with Purified Xtream UI Backend (2025.05)
 * 
 * NOTE: This API is ONLY for onboarding and license management.
 * Media content is fetched directly from the Xtream UI server.
 */
interface SmartiflyApi {
    
    // ==========================================
    // ONBOARDING & ACTIVATION (Public Endpoints)
    // ==========================================

    @POST("public/qr/generate")
    suspend fun fetchActivationSession(@Body request: QrRequest): DeviceActivationSessionResponse

    @GET("public/device/check")
    suspend fun checkDeviceStatus(@QueryMap params: Map<String, String>): DeviceStatusResponse
    
    @GET("public/portal/validate")
    suspend fun validatePortalCode(@Query("code") code: String): PortalDetailsResponse
    
    @POST("public/device/register")
    suspend fun registerDevice(@Body request: Map<String, String?>): DeviceStatusResponse

    @GET("public/config")
    suspend fun getAppConfig(@Query("licenseKey") licenseKey: String? = null): Map<String, Any>

    // ==========================================
    // MANAGEMENT (Future use)
    // ==========================================
    
    @GET("public/announcements")
    suspend fun getAnnouncements(): List<Map<String, Any>>

    // ==========================================
    // INTELLIGENCE & TRACKING
    // ==========================================

    @POST("public/analytics/playback")
    suspend fun trackPlayback(@Body event: Map<String, String>)

    @GET("public/analytics/trending")
    suspend fun getTrendingIds(): Map<String, Any>

    @POST("public/analytics/resume")
    suspend fun syncResumeWatching(@Body body: Map<String, Any>): Map<String, Any>

    @GET("public/analytics/resume/{profileId}")
    suspend fun fetchResumeWatching(@Path("profileId") profileId: String): Map<String, Any>

    @GET("public/analytics/discovery/suggestions")
    suspend fun getSearchSuggestions(): Map<String, Any>

    @POST("public/analytics/parental/validate")
    suspend fun validateParentalPin(@Body body: Map<String, String>): Map<String, Any>

    @GET("public/analytics/parental/config")
    suspend fun getParentalConfig(@Query("userId") userId: String? = null): Map<String, Any>

    @GET("public/content/enrich")
    suspend fun fetchEnrichedMetadata(
        @Query("id") id: String,
        @Query("title") title: String,
        @Query("type") type: String
    ): Map<String, Any>

    @GET("public/profiles")
    suspend fun fetchProfiles(@Query("userId") userId: String): Map<String, Any>

    @POST("public/profiles/select")
    suspend fun selectProfile(@Body body: Map<String, String>): Map<String, Any>

    @PUT("public/profiles/update")
    suspend fun updateProfile(@Body body: Map<String, String?>): Map<String, Any>

    @GET("public/analytics/discovery/smart-rows")
    suspend fun getSmartRows(@Query("profileId") profileId: String): Map<String, Any>

    @POST("public/telemetry/provider-health")
    suspend fun ingestProviderHealth(
        @Body body: ProviderHealthIngestRequest
    ): ProviderHealthIngestResponse
}
