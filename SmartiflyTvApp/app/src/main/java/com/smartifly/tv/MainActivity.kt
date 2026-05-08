package com.smartifly.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.remember
import com.smartifly.tv.di.AppGraph
import com.smartifly.tv.ui.SmartiflyTvRoot

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val appGraph = remember { AppGraph(applicationContext) }
            SmartiflyTvRoot(appGraph = appGraph)
        }
    }
}
