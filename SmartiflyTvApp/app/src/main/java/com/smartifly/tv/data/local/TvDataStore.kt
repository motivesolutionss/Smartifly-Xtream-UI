package com.smartifly.tv.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore

private const val TV_DATASTORE_NAME = "smartifly_tv_datastore"

val Context.tvDataStore: androidx.datastore.core.DataStore<Preferences> by preferencesDataStore(
    name = TV_DATASTORE_NAME
)

