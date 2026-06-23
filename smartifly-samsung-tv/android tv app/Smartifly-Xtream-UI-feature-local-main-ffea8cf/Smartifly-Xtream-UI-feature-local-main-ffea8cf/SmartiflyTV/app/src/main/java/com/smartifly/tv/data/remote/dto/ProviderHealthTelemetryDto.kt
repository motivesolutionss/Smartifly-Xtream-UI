package com.smartifly.tv.data.remote.dto

data class ProviderHealthEventDto(
    val eventId: String,
    val deviceId: String,
    val profileId: String? = null,
    val portalIdentity: String,
    val portalBaseUrl: String,
    val host: String,
    val eventType: String,
    val context: String,
    val contentType: String? = null,
    val contentId: String? = null,
    val metadata: Map<String, Any?>? = null,
    val occurredAt: String,
    val appVersion: String,
    val platform: String = "ANDROID_TV"
)

data class ProviderHealthIngestRequest(
    val schemaVersion: Int = 1,
    val events: List<ProviderHealthEventDto>
)

data class ProviderHealthIngestResponse(
    val success: Boolean,
    val accepted: Int = 0,
    val rejected: Int = 0
)
