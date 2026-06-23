package com.smartifly.tv.player.drm

data class DrmConfig(
    val type: DrmType = DrmType.NONE,
    val licenseUrl: String? = null,
    val headers: Map<String, String> = emptyMap()
)

enum class DrmType {
    WIDEVINE,
    PLAYREADY,
    NONE
}
