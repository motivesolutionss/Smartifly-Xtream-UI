package com.smartifly.tv.features.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ContentDetailsViewModel(
    private val api: SmartiflyApi,
    private val contentId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow<ContentDetailsUiState>(ContentDetailsUiState.Loading)
    val uiState: StateFlow<ContentDetailsUiState> = _uiState

    init {
        loadDetails()
    }

    fun loadDetails() {
        viewModelScope.launch {
            _uiState.value = ContentDetailsUiState.Loading
            try {
                val details = api.getContentDetails(contentId)
                _uiState.value = ContentDetailsUiState.Success(details)
            } catch (e: Exception) {
                _uiState.value = ContentDetailsUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }
}
