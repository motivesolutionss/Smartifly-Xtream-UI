package com.smartifly.tv.data.remote.dto

import com.google.gson.annotations.SerializedName

data class LiveCategoryDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String
)

data class LiveChannelDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("logo") val logo: String,
    @SerializedName("stream_url") val streamUrl: String,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("current_program") val currentProgram: String?,
    @SerializedName("next_program") val nextProgram: String?
)
