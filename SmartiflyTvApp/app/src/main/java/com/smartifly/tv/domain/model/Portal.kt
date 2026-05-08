package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Portal(
    val id: String,
    val name: String,
    val url: String,
    val status: String? = null,
    val isPrimary: Boolean = false,
)

