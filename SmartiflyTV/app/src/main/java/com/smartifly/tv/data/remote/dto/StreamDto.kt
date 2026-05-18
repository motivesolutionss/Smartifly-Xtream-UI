package com.smartifly.tv.data.remote.dto

import com.google.gson.annotations.SerializedName

data class StreamDto(
    @SerializedName("id") val id: String,
    @SerializedName("url") val url: String,
    @SerializedName("type") val type: String, // HLS, DASH, LIVE
    @SerializedName("title") val title: String,
    @SerializedName("backdrop_url") val backdropUrl: String,
    @SerializedName("fallback_urls") val fallbackUrls: List<String> = emptyList(),
    @SerializedName("intro_start") val introStart: Long? = null,
    @SerializedName("intro_end") val introEnd: Long? = null,
    
    // DRM Fields
    @SerializedName("drm_type") val drmType: String? = "NONE", // WIDEVINE, PLAYREADY, NONE
    @SerializedName("license_url") val licenseUrl: String? = null,
    @SerializedName("license_headers") val licenseHeaders: Map<String, String>? = null
)
