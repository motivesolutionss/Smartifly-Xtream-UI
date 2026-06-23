package com.smartifly.tv.data.remote.dto

import com.google.gson.annotations.SerializedName

data class QrRequest(
    @SerializedName("licenseKey") val licenseKey: String? = null,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("softwareId") val softwareId: String? = null,
    @SerializedName("mac") val mac: String,
    @SerializedName("deviceId2") val deviceId2: String? = null,
    @SerializedName("serialNumber") val serialNumber: String? = null,
    @SerializedName("platform") val platform: String = "ANDROID_TV",
    @SerializedName("deviceFingerprint") val deviceFingerprint: String? = null,
    @SerializedName("brand") val brand: String? = null,
    @SerializedName("model") val model: String? = null,
    @SerializedName("appVersion") val appVersion: String? = null,
    @SerializedName("osVersion") val osVersion: String? = null
)

data class DeviceActivationSessionResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("qrCode") val qrCode: String?,
    @SerializedName("webLink") val webLink: String,
    @SerializedName("token") val token: String,
    @SerializedName("settingsCode") val settingsCode: String,
    @SerializedName("expiresIn") val expiresIn: String? = null
)

data class DeviceStatusResponse(
    @SerializedName("success") val success: Boolean? = null,
    @SerializedName("exists") val exists: Boolean? = null,
    @SerializedName("valid") val valid: Boolean,
    @SerializedName("state") val state: String,
    @SerializedName("statusCode") val statusCode: String? = null,
    @SerializedName("reason") val reason: String? = null,
    @SerializedName("device") val device: DeviceInfoDto? = null,
    @SerializedName("license") val license: LicenseInfoDto? = null
)

data class DeviceInfoDto(
    @SerializedName("id") val id: Int,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("mac") val mac: String?
)

data class LicenseInfoDto(
    @SerializedName("id") val id: Int,
    @SerializedName("userId") val userId: Int? = null,
    @SerializedName("plan") val plan: String,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("xtreamUser") val xtreamUser: String? = null,
    @SerializedName("xtreamPass") val xtreamPass: String? = null,
    @SerializedName("server") val server: ServerInfoDto? = null
)

data class ServerInfoDto(
    @SerializedName("name") val name: String,
    @SerializedName("url") val url: String
)

data class PortalDetailsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("portal") val portal: PortalInfoDto? = null
)

data class PortalInfoDto(
    @SerializedName("portalCode") val portalCode: String,
    @SerializedName("baseUrl") val baseUrl: String,
    @SerializedName("name") val name: String? = null
)
