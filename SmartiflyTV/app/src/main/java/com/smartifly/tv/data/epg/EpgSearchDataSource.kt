package com.smartifly.tv.data.epg

import com.smartifly.tv.features.live.epg.EpgProgram

interface EpgSearchDataSource {
    suspend fun searchPrograms(query: String): List<EpgProgram>
}
