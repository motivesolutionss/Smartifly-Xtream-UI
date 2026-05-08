package com.smartifly.tv.testutil

import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.data.remote.dto.ContentDetailsDto
import com.smartifly.tv.data.remote.dto.ContentDto
import com.smartifly.tv.data.remote.dto.HomeResponse
import com.smartifly.tv.data.remote.dto.LiveCategoryDto
import com.smartifly.tv.data.remote.dto.LiveChannelDto
import com.smartifly.tv.data.remote.dto.StreamDto

class FakeSmartiflyApi(
    var onGetHomeData: suspend () -> HomeResponse = { throw NotImplementedError() },
    var onGetMovies: suspend (String?) -> List<ContentDto> = { throw NotImplementedError() },
    var onGetSeries: suspend (String?) -> List<ContentDto> = { throw NotImplementedError() },
    var onSearch: suspend (String) -> List<ContentDto> = { throw NotImplementedError() },
    var onGetContentDetails: suspend (String) -> ContentDetailsDto = { throw NotImplementedError() },
    var onGetLiveCategories: suspend () -> List<LiveCategoryDto> = { throw NotImplementedError() },
    var onGetLiveChannels: suspend (String?) -> List<LiveChannelDto> = { throw NotImplementedError() },
    var onGetStream: suspend (String, String) -> StreamDto = { _, _ -> throw NotImplementedError() }
) : SmartiflyApi {
    override suspend fun getHomeData(): HomeResponse = onGetHomeData()

    override suspend fun getMovies(category: String?): List<ContentDto> = onGetMovies(category)

    override suspend fun getSeries(category: String?): List<ContentDto> = onGetSeries(category)

    override suspend fun search(query: String): List<ContentDto> = onSearch(query)

    override suspend fun getContentDetails(id: String): ContentDetailsDto = onGetContentDetails(id)

    override suspend fun getLiveCategories(): List<LiveCategoryDto> = onGetLiveCategories()

    override suspend fun getLiveChannels(categoryId: String?): List<LiveChannelDto> = onGetLiveChannels(categoryId)

    override suspend fun getStream(id: String, contentType: String): StreamDto = onGetStream(id, contentType)
}
