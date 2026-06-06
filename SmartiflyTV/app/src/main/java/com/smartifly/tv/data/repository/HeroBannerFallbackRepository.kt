package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.SmartiflyApi
import retrofit2.HttpException
import java.io.IOException

interface HeroBannerFallbackDataSource {
    suspend fun getFallbackHeroBanners(): List<MovieMetadata>
}

class HeroBannerFallbackRepository(
    private val api: SmartiflyApi
) : HeroBannerFallbackDataSource {

    override suspend fun getFallbackHeroBanners(): List<MovieMetadata> {
        return try {
            val response = api.getHeroBanners()
            val rows = (response["data"] as? List<*>) ?: emptyList<Any>()
            rows.mapNotNull { row ->
                val map = row as? Map<*, *> ?: return@mapNotNull null
                val title = (map["title"] as? String).orEmpty().trim()
                val imageUrl = (map["imageUrl"] as? String).orEmpty().trim()
                if (title.isBlank() || imageUrl.isBlank()) return@mapNotNull null
                val subtitle = (map["subtitle"] as? String).orEmpty()
                val targetType = (map["targetType"] as? String)?.lowercase().orEmpty()
                val type = when (targetType) {
                    "series" -> "series"
                    "live" -> "live"
                    else -> "movie"
                }
                val id = (map["id"] as? String).orEmpty().ifBlank { "hero-${title.hashCode()}" }
                MovieMetadata(
                    id = "fallback-$id",
                    title = title,
                    description = subtitle,
                    year = "",
                    rating = "",
                    duration = "",
                    posterUrl = imageUrl,
                    backdropUrl = imageUrl,
                    type = type,
                    categoryId = "fallback_hero"
                )
            }
        } catch (e: IOException) {
            android.util.Log.w("SmartiflyHero", "Fallback hero network issue: ${e.message}")
            emptyList()
        } catch (e: HttpException) {
            android.util.Log.w("SmartiflyHero", "Fallback hero HTTP ${e.code()}")
            emptyList()
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyHero", "Fallback hero parse error: ${e.message}")
            emptyList()
        }
    }
}
