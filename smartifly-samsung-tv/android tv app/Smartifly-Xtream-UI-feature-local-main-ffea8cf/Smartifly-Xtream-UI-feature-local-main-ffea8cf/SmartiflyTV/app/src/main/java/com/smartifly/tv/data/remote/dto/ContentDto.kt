package com.smartifly.tv.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ContentDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("year") val year: String?,
    @SerializedName("rating") val rating: String?,
    @SerializedName("duration") val duration: String?,
    @SerializedName("poster_url") val posterUrl: String,
    @SerializedName("backdrop_url") val backdropUrl: String,
    @SerializedName("stream_url") val streamUrl: String?
)

data class HomeResponse(
    @SerializedName("hero") val hero: ContentDto,
    @SerializedName("sections") val sections: List<HomeSectionDto>
)

data class HomeSectionDto(
    @SerializedName("title") val title: String,
    @SerializedName("items") val items: List<ContentDto>
)
