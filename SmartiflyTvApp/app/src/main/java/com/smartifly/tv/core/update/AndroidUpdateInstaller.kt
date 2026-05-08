package com.smartifly.tv.core.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

class AndroidUpdateInstaller(
    context: Context,
    private val httpClient: OkHttpClient,
) {
    private val appContext = context.applicationContext

    suspend fun downloadAndInstall(
        url: String,
        onProgress: (UpdateInstallProgress) -> Unit = {},
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val updatesDir = File(appContext.cacheDir, "updates").apply { mkdirs() }
            val apkFile = File(updatesDir, "smartifly_update.apk")

            val request = Request.Builder().url(url).build()
            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    error("Update download failed with HTTP ${response.code}")
                }
                val body = response.body ?: error("Update payload is empty")
                val totalBytes = body.contentLength().takeIf { it > 0L }
                var downloadedBytes = 0L
                onProgress(UpdateInstallProgress(phase = UpdateInstallPhase.DOWNLOADING, percent = 0))
                apkFile.outputStream().use { output ->
                    body.byteStream().use { input ->
                        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                        while (true) {
                            val read = input.read(buffer)
                            if (read <= 0) break
                            output.write(buffer, 0, read)
                            downloadedBytes += read
                            val percent = totalBytes?.let { total ->
                                ((downloadedBytes * 100L) / total).toInt().coerceIn(0, 100)
                            }
                            onProgress(
                                UpdateInstallProgress(
                                    phase = UpdateInstallPhase.DOWNLOADING,
                                    percent = percent,
                                )
                            )
                        }
                    }
                }
            }

            onProgress(UpdateInstallProgress(phase = UpdateInstallPhase.INSTALL_READY, percent = 100))
            launchInstaller(apkFile)
        }
    }

    private fun launchInstaller(apkFile: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !appContext.packageManager.canRequestPackageInstalls()
        ) {
            val intent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${appContext.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            appContext.startActivity(intent)
            error("Allow install unknown apps for Smartifly TV, then retry the update.")
        }

        val uri = FileProvider.getUriForFile(
            appContext,
            "${appContext.packageName}.fileprovider",
            apkFile,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        appContext.startActivity(intent)
    }
}
