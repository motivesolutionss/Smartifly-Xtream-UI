package com.smartifly.tv.data.remote

import com.google.gson.annotations.SerializedName

data class LicenseResponseDto(
    @SerializedName("status") val status: String? = null, // e.g., "active", "expired", "revoked"
    @SerializedName("message") val message: String? = null,
    @SerializedName("device_id") val deviceId: String? = null,
    @SerializedName("expiry_date") val expiryDate: String? = null,
    @SerializedName("authorized") val authorized: Boolean = false
)

data class UpdateResponseDto(
    @SerializedName("version_code") val versionCode: Int? = null,
    @SerializedName("version_name") val versionName: String? = null,
    @SerializedName("update_url") val updateUrl: String? = null,
    @SerializedName("is_mandatory") val isMandatory: Boolean = false,
    @SerializedName("release_notes") val releaseNotes: String? = null
)

data class MasterAnnouncementDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("title") val title: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("content") val content: String? = null,
    @SerializedName("timestamp") val timestamp: Long? = null,
    @SerializedName("priority") val priority: String? = null // "normal", "high", "critical"
)

data class DeviceCheckRequestDto(
    @SerializedName("hardwareId") val hardwareId: String,
    @SerializedName("deviceModel") val deviceModel: String,
    @SerializedName("osVersion") val osVersion: String,
)

data class DeviceCheckResponseDto(
    @SerializedName("status") val status: String? = null,
    @SerializedName("message") val message: String? = null,
)

data class SecurityPayloadDto(
    @SerializedName("isRooted") val isRooted: Boolean = false,
    @SerializedName("isEmulator") val isEmulator: Boolean = false,
    @SerializedName("isDebuggerConnected") val isDebuggerConnected: Boolean = false,
    @SerializedName("isHooked") val isHooked: Boolean = false,
)

data class BootCheckRequestDto(
    @SerializedName("licenseKey") val licenseKey: String,
    @SerializedName("hardwareId") val hardwareId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("deviceModel") val deviceModel: String,
    @SerializedName("osName") val osName: String = "android",
    @SerializedName("osVersion") val osVersion: String,
    @SerializedName("appVersion") val appVersion: String,
    @SerializedName("security") val security: SecurityPayloadDto = SecurityPayloadDto(),
)

data class MasterBroadcastDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("type") val type: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
)

data class BootCheckResponseDto(
    @SerializedName("status") val status: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("client") val client: String? = null,
    @SerializedName("config") val config: Map<String, @JvmSuppressWildcards Any>? = null,
    @SerializedName("broadcasts") val broadcasts: List<MasterBroadcastDto> = emptyList(),
)

data class ReportLoginRequestDto(
    @SerializedName("licenseKey") val licenseKey: String,
    @SerializedName("hardwareId") val hardwareId: String,
    @SerializedName("serverUrl") val serverUrl: String,
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String,
)

data class AppUpdateDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("version") val version: String? = null,
    @SerializedName("url") val url: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("isMandatory") val isMandatory: Boolean = false,
    @SerializedName("fileSize") val fileSize: Long? = null
)
