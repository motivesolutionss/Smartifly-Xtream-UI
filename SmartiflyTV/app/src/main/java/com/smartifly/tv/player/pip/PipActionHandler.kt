package com.smartifly.tv.player.pip

import android.app.PendingIntent
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import androidx.annotation.RequiresApi
import com.smartifly.tv.R

class PipActionHandler : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        // Handle Play/Pause actions from PiP window
        when (intent?.action) {
            ACTION_PLAY -> { /* Global Play Command */ }
            ACTION_PAUSE -> { /* Global Pause Command */ }
        }
    }

    companion object {
        const val ACTION_PLAY = "com.smartifly.tv.ACTION_PLAY"
        const val ACTION_PAUSE = "com.smartifly.tv.ACTION_PAUSE"
    }
}
