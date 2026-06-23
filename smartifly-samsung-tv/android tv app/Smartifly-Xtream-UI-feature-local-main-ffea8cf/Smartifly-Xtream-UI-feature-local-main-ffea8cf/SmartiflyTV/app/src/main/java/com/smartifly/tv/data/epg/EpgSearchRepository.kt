package com.smartifly.tv.data.epg

import com.smartifly.tv.features.live.epg.EpgProgram
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class EpgSearchRepository(private val epgRepository: EpgRepository) : EpgSearchDataSource {
    
    override suspend fun searchPrograms(query: String): List<EpgProgram> = withContext(Dispatchers.IO) {
        if (query.length < 2) return@withContext emptyList()
        
        // In a real app, this would query a local SQLite database or a specialized search API
        // For now, we search within the cached channel programs
        val allChannels = epgRepository.getEpgForChannels((1..20).map { "$it" })
        
        allChannels.flatMap { it.programs }
            .filter { it.title.contains(query, ignoreCase = true) }
            .take(20)
    }
}
