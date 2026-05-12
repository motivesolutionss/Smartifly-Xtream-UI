package com.smartifly.tv.player.pip

import android.app.Activity
import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import androidx.annotation.RequiresApi

object PipManager {
    @Volatile
    private var playbackActive: Boolean = false

    fun enterPipMode(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            activity.enterPictureInPictureMode(params)
        }
    }

    fun setPlaybackActive(isActive: Boolean) {
        playbackActive = isActive
    }

    fun isPlaybackActive(): Boolean = playbackActive

    fun isPipSupported(activity: Activity): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && 
               activity.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE)
    }
}
