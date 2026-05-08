package com.smartifly.tv.data.models

data class ChannelMetadata(
    val id: String,
    val name: String,
    val logoUrl: String,
    val currentProgram: String,
    val nextProgram: String,
    val category: String
)
