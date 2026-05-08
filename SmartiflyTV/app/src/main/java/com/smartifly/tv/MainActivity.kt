package com.smartifly.tv

import android.content.res.Configuration
import android.os.Bundle
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import com.smartifly.tv.navigation.SmartiflyNavGraph
import com.smartifly.tv.player.pip.PipManager

class MainActivity : ComponentActivity() {
    private val isInPipMode = mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val initialIntentData = intent?.data
        
        setContent {
            SmartiflyNavGraph(
                isInPipMode = isInPipMode.value,
                initialIntentUri = initialIntentData
            )
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Enter PiP when Home is pressed, but only if we are playing video
        // We'll use a global state or check the current destination
        if (PipManager.isPipSupported(this)) {
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
