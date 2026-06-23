package com.smartifly.tv.data.models

/**
 * Enterprise-grade Domain Model for Live TV Streams.
 * 
 * Represents a live television channel with metadata and current program context.
 */
data class LiveStream(
    val id: String,
    val name: String,
    val logoUrl: String,
    val categoryId: String,
    val streamType: String = "live",
    val archiveAvailable: Boolean = false,
    val archiveDuration: Int = 0,
    val currentProgram: String? = null,
    val nextProgram: String? = null
)

/**
 * Domain model for media categories (Live, Movies, Series).
 */
data class MediaCategory(
    val id: String,
    val name: String,
    val parentId: Int = 0
)
