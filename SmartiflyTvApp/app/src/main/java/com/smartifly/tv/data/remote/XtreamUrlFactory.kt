package com.smartifly.tv.data.remote

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

fun buildXtreamPlayerApiUrl(serverUrl: String): HttpUrl? {
    val normalized = serverUrl.trim().trimEnd('/').removeSuffix("/player_api.php")
    return "$normalized/player_api.php".toHttpUrlOrNull()
}
