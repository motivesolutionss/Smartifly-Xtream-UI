package com.smartifly.tv

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import com.smartifly.tv.navigation.SmartiflyNavGraph
import com.smartifly.tv.player.pip.PipManager

class MainActivity : ComponentActivity() {
    private val isInPipMode = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize global dependencies
        com.smartifly.tv.data.remote.ApiClient.init(this)

        setContent {
            SmartiflyNavGraph(isInPipMode = isInPipMode.value)
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
}
