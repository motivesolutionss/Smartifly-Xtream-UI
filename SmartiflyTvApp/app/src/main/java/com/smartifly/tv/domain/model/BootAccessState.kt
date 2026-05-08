package com.smartifly.tv.domain.model

data class BootAccessState(
    val isChecking: Boolean = true,
    val isAllowed: Boolean = true,
    val status: String = "OK",
    val message: String? = null,
    val client: String? = null,
    val retryAllowed: Boolean = true,
)
