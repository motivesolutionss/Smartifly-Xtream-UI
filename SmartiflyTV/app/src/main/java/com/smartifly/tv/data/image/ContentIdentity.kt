package com.smartifly.tv.data.image

/**
 * Canonical content key for cross-rail dedup in mixed-provider catalogs.
 */
object ContentIdentity {
    fun key(
        providerKey: String,
        type: String,
        id: String,
        title: String
    ): String {
        val normalizedTitle = title
            .trim()
            .lowercase()
            .replace(Regex("\\s+"), " ")

        val titleHash = normalizedTitle.hashCode().toUInt().toString(16)
        return "${providerKey.trim().lowercase()}|${type.trim().lowercase()}|${id.trim()}|$titleHash"
    }
}

