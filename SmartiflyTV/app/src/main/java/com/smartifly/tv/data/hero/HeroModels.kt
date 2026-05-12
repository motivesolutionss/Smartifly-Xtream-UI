package com.smartifly.tv.data.hero

/**
 * Raw visual sources extracted from Xtream payloads before policy-based resolution.
 */
data class HeroImageSources(
    val backdropPaths: List<String> = emptyList(),
    val coverBig: String? = null,
    val cover: String? = null,
    val movieImage: String? = null,
    val streamIcon: String? = null
)

/**
 * Policy output that identifies which image URL won and why.
 */
data class HeroResolvedAsset(
    val url: String,
    val source: HeroImageSourceType
)

enum class HeroImageSourceType {
    BACKDROP_PATH,
    COVER_BIG,
    COVER,
    MOVIE_IMAGE,
    STREAM_ICON
}

