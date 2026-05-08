package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.HomeCatalogData
import com.smartifly.tv.domain.model.MovieDetail
import com.smartifly.tv.domain.model.PlaybackSession
import com.smartifly.tv.domain.model.SeriesDetail

interface CatalogRepository {
    suspend fun loadHomeCatalog(session: AuthSession): Result<HomeCatalogData>
    suspend fun getCachedHomeCatalog(session: AuthSession): HomeCatalogData?
    suspend fun getMovieDetail(session: AuthSession, streamId: Int, fallbackTitle: String): Result<MovieDetail>
    suspend fun getSeriesDetail(session: AuthSession, seriesId: Int, fallbackTitle: String): Result<SeriesDetail>
    suspend fun createPlaybackSessionForMovie(session: AuthSession, detail: MovieDetail): PlaybackSession
    suspend fun createPlaybackSessionForSeriesEpisode(session: AuthSession, detail: SeriesDetail, episodeId: Int): PlaybackSession
    suspend fun createPlaybackSessionForLive(session: AuthSession, streamId: Int, title: String): PlaybackSession
    suspend fun getAnnouncements(): List<com.smartifly.tv.data.remote.MasterAnnouncementDto>
}
