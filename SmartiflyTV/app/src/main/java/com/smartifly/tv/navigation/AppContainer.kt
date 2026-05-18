package com.smartifly.tv.navigation

import android.content.Context
import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel

class AppContainer(context: Context) {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val sessionManager: SessionManager = SessionManager(context.applicationContext)
    private val api: SmartiflyApi = com.smartifly.tv.data.remote.ApiClient.api
    val appGraph: AppGraph = createAppGraph(
        context = context.applicationContext,
        scope = appScope,
        sessionManager = sessionManager,
        api = api
    )

    fun close() {
        appScope.cancel()
    }
}
