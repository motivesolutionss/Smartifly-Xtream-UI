package com.smartifly.tv.features.live.epg

data class EpgProgram(
    val id: String,
    val title: String,
    val startTime: Long, // Epoch ms
    val endTime: Long, // Epoch ms
    val description: String? = null,
    val rating: String? = null,
    val channelId: String
)

data class EpgChannel(
    val id: String,
    val name: String,
    val logoUrl: String,
    val programs: List<EpgProgram>
)
