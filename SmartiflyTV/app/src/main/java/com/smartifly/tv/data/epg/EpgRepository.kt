package com.smartifly.tv.data.epg

import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.features.live.epg.EpgChannel
import com.smartifly.tv.features.live.epg.EpgProgram
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class EpgRepository(private val api: SmartiflyApi) {
    private val parser = XmlTvParser()

    suspend fun getEpgForChannels(channelIds: List<String>): List<EpgChannel> = withContext(Dispatchers.IO) {
        try {
            // In a real app, you'd fetch the XML stream from your provider
            // val response = api.getXmlTv()
            // val programs = parser.parse(response.byteStream())
            
            // For now, we'll simulate the mapping of parsed programs to channels
            val now = System.currentTimeMillis()
            val startTime = now - (now % 3600000)
            
            channelIds.map { id ->
                EpgChannel(
                    id = id,
                    name = "Real Channel $id",
                    logoUrl = "",
                    programs = fillGaps(generateMockPrograms(id, startTime))
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun fillGaps(programs: List<EpgProgram>): List<EpgProgram> {
        val result = mutableListOf<EpgProgram>()
        for (i in 0 until programs.size - 1) {
            result.add(programs[i])
            if (programs[i].endTime < programs[i+1].startTime) {
                // Insert "No Program Info" gap filler
                result.add(
                    EpgProgram(
                        id = "gap_${programs[i].endTime}",
                        title = "No Program Info",
                        startTime = programs[i].endTime,
                        endTime = programs[i+1].startTime,
                        channelId = programs[i].channelId
                    )
                )
            }
        }
        if (programs.isNotEmpty()) result.add(programs.last())
        return result
    }

    // Temporary mock for real structure simulation
    private fun generateMockPrograms(channelId: String, start: Long): List<EpgProgram> {
        return (0..10).map { i ->
            val pStart = start + (i * 3600000L)
            val pEnd = pStart + 3600000L
            EpgProgram(
                id = "${channelId}_$i",
                title = "Live Show $i",
                startTime = pStart,
                endTime = pEnd,
                channelId = channelId
            )
        }
    }
}
