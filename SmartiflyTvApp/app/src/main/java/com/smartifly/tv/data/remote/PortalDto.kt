package com.smartifly.tv.data.remote

import com.google.gson.annotations.SerializedName
import com.smartifly.tv.domain.model.Portal

data class PortalDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("url") val url: String? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("isPrimary") val isPrimary: Boolean? = null,
)

fun PortalDto.toDomain(index: Int): Portal? {
    val cleanUrl = url?.trim().orEmpty()
    if (cleanUrl.isBlank()) return null

    val resolvedId = id?.takeIf { it.isNotBlank() } ?: "portal_$index"
    val resolvedName = name?.takeIf { it.isNotBlank() } ?: "Server ${index + 1}"
    return Portal(
        id = resolvedId,
        name = resolvedName,
        url = cleanUrl,
        status = status,
        isPrimary = isPrimary ?: false,
    )
}

