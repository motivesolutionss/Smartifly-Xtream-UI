package com.smartifly.tv.data.repository

import com.google.gson.Gson
import com.google.gson.JsonElement

internal object XtreamListParser {
    private val gson = Gson()

    fun <T> parse(
        raw: JsonElement?,
        clazz: Class<T>,
        possibleKeys: List<String> = emptyList(),
        maxItems: Int = Int.MAX_VALUE
    ): List<T> {
        if (raw == null || raw.isJsonNull) return emptyList()
        val resolvedMax = maxItems.coerceAtLeast(0)
        if (resolvedMax == 0) return emptyList()

        if (raw.isJsonArray) {
            return parseArray(raw.asJsonArray, clazz, resolvedMax)
        }

        if (!raw.isJsonObject) return emptyList()
        val obj = raw.asJsonObject

        // Auth/error responses instead of content payloads.
        if (obj.has("user_info") && obj.has("server_info")) return emptyList()
        if ((obj.get("auth")?.asInt ?: -1) == 0) return emptyList()
        if (obj.getAsJsonObject("user_info")?.get("auth")?.asInt == 0) return emptyList()
        if (obj.has("error") || obj.has("Error") || obj.has("ERROR")) return emptyList()

        val keys = (possibleKeys + listOf(
            "data", "items", "list", "streams", "channels", "live_streams",
            "vod_streams", "series", "movies", "result", "results"
        )).distinct()

        for (key in keys) {
            val candidate = obj.get(key)
            if (candidate != null && candidate.isJsonArray) {
                return parseArray(candidate.asJsonArray, clazz, resolvedMax)
            }
        }

        // Numeric-keyed object format: {"0": {...}, "1": {...}}
        val entries = obj.entrySet().toList()
        if (entries.isNotEmpty() && entries.all { (k, _) -> k.toIntOrNull() != null }) {
            return entries
                .sortedBy { it.key.toInt() }
                .asSequence()
                .mapNotNull { (_, value) -> runCatching { gson.fromJson(value, clazz) }.getOrNull() }
                .take(resolvedMax)
                .toList()
        }

        return emptyList()
    }

    private fun <T> parseArray(
        array: com.google.gson.JsonArray,
        clazz: Class<T>,
        maxItems: Int
    ): List<T> {
        return buildList {
            for (element in array) {
                if (size >= maxItems) break
                val parsed = runCatching { gson.fromJson(element, clazz) }.getOrNull() ?: continue
                add(parsed)
            }
        }
    }
}
