package com.smartifly.tv.data.remote

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

data class XtreamAuthResponseDto(
    @SerializedName("user_info") val userInfo: XtreamUserInfoDto? = null,
    @SerializedName("message") val message: String? = null,
)

data class XtreamUserInfoDto(
    @SerializedName("auth") val auth: JsonElement? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("exp_date") val expDate: String? = null,
    @SerializedName("active_cons") val activeCons: String? = null,
    @SerializedName("max_connections") val maxConnections: String? = null,
    @SerializedName("message") val message: String? = null,
)

fun XtreamUserInfoDto.authAsIntOrNull(): Int? {
    val value = auth ?: return null
    if (!value.isJsonPrimitive) return null
    val primitive = value.asJsonPrimitive
    return when {
        primitive.isNumber -> primitive.asInt
        primitive.isString -> primitive.asString.trim().toIntOrNull()
        primitive.isBoolean -> if (primitive.asBoolean) 1 else 0
        else -> null
    }
}
