package com.smartifly.tv.core.update

enum class UpdateInstallPhase {
    DOWNLOADING,
    INSTALL_READY,
}

data class UpdateInstallProgress(
    val phase: UpdateInstallPhase,
    val percent: Int? = null,
)
