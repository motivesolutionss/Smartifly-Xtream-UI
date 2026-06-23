package com.smartifly.tv.data.warmup

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object CatalogWarmupRuntime {
    private val _state = MutableStateFlow(CatalogWarmupState())
    val state: StateFlow<CatalogWarmupState> = _state.asStateFlow()

    fun update(state: CatalogWarmupState) {
        _state.value = state
    }
}

