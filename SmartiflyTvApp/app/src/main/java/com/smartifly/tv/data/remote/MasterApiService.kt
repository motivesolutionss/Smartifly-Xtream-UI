package com.smartifly.tv.data.remote

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface MasterApiService {
    @POST("device-check")
    suspend fun deviceCheck(
        @Header("x-master-api-key") apiKey: String,
        @Header("x-hardware-id") hardwareId: String,
        @Body request: DeviceCheckRequestDto,
    ): DeviceCheckResponseDto

    @POST("check-in")
    suspend fun bootCheck(
        @Header("x-master-api-key") apiKey: String,
        @Header("x-hardware-id") hardwareId: String,
        @Body request: BootCheckRequestDto,
    ): BootCheckResponseDto

    @POST("report")
    suspend fun reportLogin(
        @Header("x-master-api-key") apiKey: String,
        @Header("x-hardware-id") hardwareId: String,
        @Body request: ReportLoginRequestDto,
    )
}
