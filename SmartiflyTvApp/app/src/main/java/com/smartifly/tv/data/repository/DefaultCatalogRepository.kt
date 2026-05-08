package com.smartifly.tv.data.repository

import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.data.remote.XtreamContentService
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.HomeCatalogData
import com.smartifly.tv.domain.model.HomeRail
import com.smartifly.tv.domain.model.MovieDetail
import com.smartifly.tv.domain.model.PlaybackSession
import com.smartifly.tv.domain.model.SeriesDetail
import com.smartifly.tv.domain.model.SeriesEpisode
import com.smartifly.tv.domain.repository.CatalogRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlin.random.Random

class DefaultCatalogRepository(
    private val xtreamContentService: XtreamContentService,
    private val backendApi: com.smartifly.tv.data.remote.BackendApiService,
    private val preferences: AppPreferencesDataSource,
) : CatalogRepository {
    override suspend fun loadHomeCatalog(session: AuthSession): Result<HomeCatalogData> {
        return runCatching {
            val liveCategories = xtreamContentService.getLiveCategories(session).take(12)
            val vodCategories = xtreamContentService.getVodCategories(session).take(12)
            val seriesCategories = xtreamContentService.getSeriesCategories(session).take(12)

            val liveRails = coroutineScope {
                liveCategories.map { category ->
                    async {
                        val categoryId = category.categoryId.orEmpty()
                        val categoryName = category.categoryName?.takeIf { it.isNotBlank() } ?: "Live TV"
                        val channels = xtreamContentService.getLiveStreams(session, categoryId)
                            .take(50)
                            .mapNotNull { channel ->
                                val id = channel.streamId?.toString() ?: return@mapNotNull null
                                val title = channel.name ?: return@mapNotNull null
                                CatalogItem(
                                    id = "live_$id",
                                    sourceId = id.toIntOrNull() ?: return@mapNotNull null,
                                    title = title,
                                    imageUrl = channel.streamIcon.orEmpty(),
                                    categoryId = categoryId,
                                    categoryName = categoryName,
                                    type = "live",
                                )
                            }

                        if (channels.isNotEmpty()) {
                            HomeRail(
                                id = "live_$categoryId",
                                title = categoryName,
                                items = channels
                            )
                        } else {
                            null
                        }
                    }
                }.awaitAll().filterNotNull()
            }

            val movieRails = coroutineScope {
                vodCategories.map { category ->
                    async {
                        val categoryId = category.categoryId.orEmpty()
                        val categoryName = category.categoryName?.takeIf { it.isNotBlank() } ?: "Movies"
                        val movies = xtreamContentService.getVodStreams(session, categoryId)
                            .take(50)
                            .mapNotNull { movie ->
                                val id = movie.streamId?.toString() ?: return@mapNotNull null
                                val title = movie.name ?: return@mapNotNull null
                                CatalogItem(
                                    id = "movie_$id",
                                    sourceId = id.toIntOrNull() ?: return@mapNotNull null,
                                    title = title,
                                    imageUrl = movie.streamIcon.orEmpty(),
                                    categoryId = categoryId,
                                    categoryName = categoryName,
                                    type = "movie",
                                    rating = movie.rating?.toDoubleOrNull(),
                                    contentRating = com.smartifly.tv.core.policy.ContentRatingHelper.estimateRatingFromStars(movie.rating?.toDoubleOrNull()),
                                )
                            }

                        if (movies.isNotEmpty()) {
                            HomeRail(
                                id = "movie_$categoryId",
                                title = categoryName,
                                items = movies
                            )
                        } else {
                            null
                        }
                    }
                }.awaitAll().filterNotNull()
            }

            val seriesRails = coroutineScope {
                seriesCategories.map { category ->
                    async {
                        val categoryId = category.categoryId.orEmpty()
                        val categoryName = category.categoryName?.takeIf { it.isNotBlank() } ?: "Series"
                        val series = xtreamContentService.getSeries(session, categoryId)
                            .take(50)
                            .mapNotNull { item ->
                                val id = item.seriesId?.toString() ?: return@mapNotNull null
                                val title = item.name ?: return@mapNotNull null
                                CatalogItem(
                                    id = "series_$id",
                                    sourceId = id.toIntOrNull() ?: return@mapNotNull null,
                                    title = title,
                                    imageUrl = item.cover.orEmpty(),
                                    categoryId = categoryId,
                                    categoryName = categoryName,
                                    type = "series",
                                    rating = item.rating?.toDoubleOrNull(),
                                    contentRating = com.smartifly.tv.core.policy.ContentRatingHelper.estimateRatingFromStars(item.rating?.toDoubleOrNull()),
                                )
                            }

                        if (series.isNotEmpty()) {
                            HomeRail(
                                id = "series_$categoryId",
                                title = categoryName,
                                items = series
                            )
                        } else {
                            null
                        }
                    }
                }.awaitAll().filterNotNull()
            }

            val allFetchedRails = (liveRails + movieRails + seriesRails)
                .filter { it.items.isNotEmpty() }

            val displayRails = allFetchedRails
                .shuffled(Random(System.currentTimeMillis()))
                .take(12)

            val allItems = allFetchedRails.flatMap { it.items }.distinctBy { it.id }
            val heroCandidate = selectHeroCandidate(
                session = session,
                items = allItems,
            )
            val hero = heroCandidate?.let { enrichHeroItem(session, it) }
            hero?.let { preferences.saveLastHomeHero(session.cacheKey(), it.id) }

            HomeCatalogData(
                hero = hero,
                rails = displayRails,
                allItems = allItems,
            )
        }.onSuccess { data ->
            if (hasMinimumHomeContent(data)) {
                preferences.saveHomeCatalogCache(
                    sessionKey = session.cacheKey(),
                    data = data,
                )
            }
        }
    }

    override suspend fun getCachedHomeCatalog(session: AuthSession): HomeCatalogData? {
        return preferences.getHomeCatalogCache(session.cacheKey())
    }

    override suspend fun getMovieDetail(
        session: AuthSession,
        streamId: Int,
        fallbackTitle: String,
    ): Result<MovieDetail> {
        return runCatching {
            val response = xtreamContentService.getVodInfo(session, streamId)
            val info = response?.info

            MovieDetail(
                streamId = streamId,
                title = info?.name ?: fallbackTitle,
                plot = info?.plot ?: "No description available.",
                rating = info?.rating?.toDoubleOrNull(),
                genre = info?.genre,
                director = info?.director,
                cast = info?.cast,
                duration = info?.duration,
                releaseYear = info?.releasedate?.take(4),
                posterUrl = info?.movieImage.orEmpty(),
                backdropUrl = info?.backdropPath?.firstOrNull().orEmpty(),
                trailerUrl = info?.youtubeTrailer,
                contentRating = info?.rating,
            )
        }
    }

    override suspend fun getSeriesDetail(
        session: AuthSession,
        seriesId: Int,
        fallbackTitle: String,
    ): Result<SeriesDetail> {
        return runCatching {
            val response = xtreamContentService.getSeriesInfo(session, seriesId)
            val info = response?.info

            val episodes = response?.episodes.orEmpty()
                .toList()
                .sortedBy { (seasonKey, _) -> seasonKey.toIntOrNull() ?: 0 }
                .flatMap { (seasonKey, seasonEpisodes) ->
                    val seasonNumber = seasonKey.toIntOrNull() ?: 0
                    seasonEpisodes.mapNotNull { episode ->
                        val id = episode.id ?: return@mapNotNull null
                        SeriesEpisode(
                            id = id,
                            title = episode.title ?: "Episode $id",
                            episodeNumber = episode.episodeNum ?: 0,
                            seasonNumber = seasonNumber,
                            duration = episode.info?.duration,
                            imageUrl = episode.info?.movieImage.orEmpty(),
                            containerExtension = episode.containerExtension,
                        )
                    }
                }

            SeriesDetail(
                seriesId = seriesId,
                title = info?.name ?: fallbackTitle,
                plot = info?.plot ?: "No description available.",
                rating = info?.rating?.toDoubleOrNull(),
                genre = info?.genre,
                director = info?.director,
                cast = info?.cast,
                posterUrl = info?.cover.orEmpty(),
                backdropUrl = info?.backdropPath?.firstOrNull().orEmpty(),
                trailerUrl = info?.youtubeTrailer,
                episodes = episodes,
                contentRating = info?.rating,
            )
        }
    }

    override suspend fun createPlaybackSessionForMovie(
        session: AuthSession,
        detail: MovieDetail,
    ): PlaybackSession {
        return PlaybackSession(
            title = detail.title,
            streamUrl = xtreamContentService.buildMovieUrl(
                session = session,
                streamId = detail.streamId,
                extension = "mp4"
            ),
            type = "movie",
            historyId = "movie_${detail.streamId}",
            sourceId = detail.streamId,
            imageUrl = detail.backdropUrl.ifBlank { detail.posterUrl },
        )
    }

    override suspend fun createPlaybackSessionForSeriesEpisode(
        session: AuthSession,
        detail: SeriesDetail,
        episodeId: Int,
    ): PlaybackSession {
        val episode = detail.episodes.firstOrNull { it.id == episodeId }
            ?: error("Episode not found")

        return PlaybackSession(
            title = "${detail.title} • S${episode.seasonNumber}E${episode.episodeNumber}",
            streamUrl = xtreamContentService.buildSeriesUrl(
                session = session,
                streamId = episode.id,
                extension = episode.containerExtension ?: "mkv"
            ),
            type = "series",
            historyId = "series_${detail.seriesId}",
            sourceId = detail.seriesId,
            imageUrl = detail.backdropUrl.ifBlank { detail.posterUrl },
            episodeId = episode.id,
        )
    }

    override suspend fun createPlaybackSessionForLive(
        session: AuthSession,
        streamId: Int,
        title: String,
    ): PlaybackSession {
        return PlaybackSession(
            title = title,
            streamUrl = xtreamContentService.buildLiveUrl(
                session = session,
                streamId = streamId,
            ),
            type = "live",
            historyId = "live_$streamId",
            sourceId = streamId,
        )
    }

    override suspend fun getAnnouncements(): List<com.smartifly.tv.data.remote.MasterAnnouncementDto> {
        return runCatching { backendApi.getAnnouncements() }.getOrDefault(emptyList())
    }

    private suspend fun enrichHeroItem(
        session: AuthSession,
        item: CatalogItem,
    ): CatalogItem {
        return runCatching {
            when (item.type.lowercase()) {
                "movie" -> {
                    val info = xtreamContentService.getVodInfo(session, item.sourceId)?.info
                    item.copy(
                        imageUrl = info?.backdropPath?.firstOrNull()
                            .orEmpty()
                            .ifBlank { info?.movieImage.orEmpty() }
                            .ifBlank { item.imageUrl },
                        description = info?.plot
                            ?.takeIf { it.isNotBlank() }
                            ?: item.description,
                    )
                }

                "series" -> {
                    val info = xtreamContentService.getSeriesInfo(session, item.sourceId)?.info
                    item.copy(
                        imageUrl = info?.backdropPath?.firstOrNull()
                            .orEmpty()
                            .ifBlank { info?.cover.orEmpty() }
                            .ifBlank { item.imageUrl },
                        description = info?.plot
                            ?.takeIf { it.isNotBlank() }
                            ?: item.description,
                    )
                }

                else -> item
            }
        }.getOrDefault(item)
    }

    private fun hasMinimumHomeContent(data: HomeCatalogData): Boolean {
        return data.rails.isNotEmpty() || data.allItems.isNotEmpty()
    }

    private suspend fun selectHeroCandidate(
        session: AuthSession,
        items: List<CatalogItem>,
    ): CatalogItem? {
        if (items.isEmpty()) return null

        val lastHeroId = preferences.getLastHomeHero(session.cacheKey())
        val preferredPool = items.filter { item ->
            item.type == "movie" && item.imageUrl.isNotBlank()
        }
        val fallbackPool = items.filter { item ->
            item.type == "series" && item.imageUrl.isNotBlank()
        }
        val anyImagePool = items.filter { it.imageUrl.isNotBlank() }

        return chooseNonRepeatingHero(preferredPool, lastHeroId)
            ?: chooseNonRepeatingHero(fallbackPool, lastHeroId)
            ?: chooseNonRepeatingHero(anyImagePool, lastHeroId)
            ?: chooseNonRepeatingHero(items, lastHeroId)
    }

    private fun chooseNonRepeatingHero(
        items: List<CatalogItem>,
        lastHeroId: String?,
    ): CatalogItem? {
        if (items.isEmpty()) return null
        return items.firstOrNull { it.id != lastHeroId } ?: items.firstOrNull()
    }

    private fun AuthSession.cacheKey(): String = "${portalId}_${username}"
}
