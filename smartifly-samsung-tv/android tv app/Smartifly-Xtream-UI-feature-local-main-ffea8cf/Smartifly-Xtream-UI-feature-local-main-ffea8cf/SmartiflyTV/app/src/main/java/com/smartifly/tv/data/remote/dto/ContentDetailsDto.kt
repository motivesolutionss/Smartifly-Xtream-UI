package com.smartifly.tv.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ContentDetailsDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("year") val year: String?,
    @SerializedName("rating") val rating: String?,
    @SerializedName("duration") val duration: String?,
    @SerializedName("poster_url") val posterUrl: String,
    @SerializedName("backdrop_url") val backdropUrl: String,
    @SerializedName("genres") val genres: List<String>,
    @SerializedName("cast") val cast: List<CastMemberDto>,
    @SerializedName("trailer_url") val trailerUrl: String?,
    @SerializedName("similar") val similar: List<ContentDto>
)

data class CastMemberDto(
    @SerializedName("name") val name: String,
    @SerializedName("role") val role: String,
    @SerializedName("profile_url") val profileUrl: String?
)
