package com.smartifly.tv.data.hero

/**
 * Centralized image resolution policy for hero/banner-safe image URLs.
 *
 * Rules:
 * 1) Prefer real backdrops.
 * 2) Fall back to wide covers.
 * 3) Fall back to portrait art only if nothing else exists.
 * 4) Reject malformed/non-http URLs.
 */
object HeroImageResolver {
    @Volatile
    private var portalBaseUrl: String? = null

    fun setPortalBaseUrl(baseUrl: String?) {
        portalBaseUrl = baseUrl
            ?.trim()
            ?.removeSuffix("/")
            ?.takeIf { it.startsWith("http://", ignoreCase = true) || it.startsWith("https://", ignoreCase = true) }
    }

    fun resolveForMovie(sources: HeroImageSources): HeroResolvedAsset? {
        val ordered = listOf(
            HeroImageSourceType.BACKDROP_PATH to sources.backdropPaths.firstOrNull(),
            HeroImageSourceType.COVER_BIG to sources.coverBig,
            HeroImageSourceType.COVER to sources.cover,
            HeroImageSourceType.MOVIE_IMAGE to sources.movieImage,
            HeroImageSourceType.STREAM_ICON to sources.streamIcon
        )

        for ((type, raw) in ordered) {
            val normalized = normalizeImageUrl(raw)
            if (normalized != null) return HeroResolvedAsset(normalized, type)
        }
        return null
    }

    fun resolveForSeries(sources: HeroImageSources): HeroResolvedAsset? {
        val ordered = listOf(
            HeroImageSourceType.BACKDROP_PATH to sources.backdropPaths.firstOrNull(),
            HeroImageSourceType.COVER_BIG to sources.coverBig,
            HeroImageSourceType.COVER to sources.cover
        )

        for ((type, raw) in ordered) {
            val normalized = normalizeImageUrl(raw)
            if (normalized != null) return HeroResolvedAsset(normalized, type)
        }
        return null
    }

    /**
     * Returns canonical URL or null if invalid/unsafe for remote image loading.
     */
    fun normalizeImageUrl(raw: String?): String? {
        if (raw.isNullOrBlank()) return null

        var cleaned = raw
            .trim()
            .replace(Regex("[\\u0000-\\u001F]"), "")
            .replace(Regex("[\\u200B-\\u200D\\uFEFF]"), "")

        if (cleaned.isBlank()) return null

        if (cleaned.startsWith("//")) {
            cleaned = "https:$cleaned"
        } else if (cleaned.startsWith("/")) {
            val base = portalBaseUrl ?: return null
            cleaned = "$base$cleaned"
        }

        if (!cleaned.startsWith("http://", ignoreCase = true) &&
            !cleaned.startsWith("https://", ignoreCase = true)
        ) {
            return null
        }

        return try {
            val uri = java.net.URI(cleaned)
            val host = uri.host ?: return null
            if (host.isBlank()) return null
            cleaned
        } catch (_: Exception) {
            android.util.Log.w("SmartiflyHero", "hero_reject_reason=invalid_url value=$cleaned")
            null
        }
    }
}
