package com.smartifly.tv

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import com.smartifly.tv.navigation.AppContainer
import com.smartifly.tv.navigation.SmartiflyNavGraph
import com.smartifly.tv.player.pip.PipManager

class MainActivity : ComponentActivity() {
    private val isInPipMode = mutableStateOf(false)
    private lateinit var appContainer: AppContainer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize global dependencies
        com.smartifly.tv.data.remote.ApiClient.init(this)
        appContainer = AppContainer(applicationContext)

        setContent {
            SmartiflyNavGraph(
                appContext = applicationContext,
                appGraph = appContainer.appGraph,
                isInPipMode = isInPipMode.value
            )
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (PipManager.isPipSupported(this) && PipManager.isPlaybackActive()) {
            PipManager.enterPipMode(this)
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isInPipMode.value = isInPictureInPictureMode
    }

    override fun onDestroy() {
        if (::appContainer.isInitialized) {
            appContainer.close()
        }
        super.onDestroy()
    }
}
