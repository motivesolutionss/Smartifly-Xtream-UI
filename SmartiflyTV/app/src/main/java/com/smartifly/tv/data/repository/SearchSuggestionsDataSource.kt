package com.smartifly.tv.data.repository

interface SearchSuggestionsDataSource {
    suspend fun getSearchSuggestions(): List<String>
}
