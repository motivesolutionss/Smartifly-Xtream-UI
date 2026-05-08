package com.smartifly.tv.core.download

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import java.io.File

data class DownloadEnqueueResult(
    val enqueueId: Long,
    val destinationPath: String,
)

data class DownloadStatusSnapshot(
    val status: DownloadManagerStatus,
    val downloadedBytes: Long,
    val totalBytes: Long,
    val localUri: String?,
    val reason: Int?,
)

enum class DownloadManagerStatus {
    RUNNING,
    PAUSED,
    SUCCESSFUL,
    FAILED,
    PENDING,
    UNKNOWN,
}

class AndroidDownloadEngine(
    context: Context,
) {
    private val appContext = context.applicationContext
    private val downloadManager = appContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

    fun enqueue(
        id: String,
        title: String,
        url: String,
    ): DownloadEnqueueResult {
        val extension = inferExtension(url)
        val safeName = sanitizeFileName("${id}_${title}.$extension")
        val destinationDir = appContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
            ?: appContext.filesDir
        val destinationFile = File(destinationDir, safeName)

        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle(title)
            .setDescription("Downloading for offline playback")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)
            .setDestinationUri(Uri.fromFile(destinationFile))

        val enqueueId = downloadManager.enqueue(request)
        return DownloadEnqueueResult(
            enqueueId = enqueueId,
            destinationPath = destinationFile.absolutePath
        )
    }

    fun remove(enqueueId: Long) {
        downloadManager.remove(enqueueId)
    }

    fun deleteLocalFile(pathOrUri: String?) {
        val value = pathOrUri?.trim().orEmpty()
        if (value.isBlank()) return

        val path = when {
            value.startsWith("file://") -> runCatching { Uri.parse(value).path }.getOrNull()
            value.startsWith("/") -> value
            else -> null
        } ?: return

        runCatching {
            val file = File(path)
            if (file.exists()) {
                file.delete()
            }
        }
    }

    fun query(enqueueId: Long): DownloadStatusSnapshot? {
        val query = DownloadManager.Query().setFilterById(enqueueId)
        downloadManager.query(query).use { cursor ->
            if (!cursor.moveToFirst()) return null

            val statusValue = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            val downloadedBytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val totalBytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            val localUri = cursor.getString(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI))
            val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))

            return DownloadStatusSnapshot(
                status = mapStatus(statusValue),
                downloadedBytes = downloadedBytes,
                totalBytes = totalBytes,
                localUri = localUri,
                reason = reason,
            )
        }
    }

    private fun mapStatus(status: Int): DownloadManagerStatus {
        return when (status) {
            DownloadManager.STATUS_RUNNING -> DownloadManagerStatus.RUNNING
            DownloadManager.STATUS_PAUSED -> DownloadManagerStatus.PAUSED
            DownloadManager.STATUS_SUCCESSFUL -> DownloadManagerStatus.SUCCESSFUL
            DownloadManager.STATUS_FAILED -> DownloadManagerStatus.FAILED
            DownloadManager.STATUS_PENDING -> DownloadManagerStatus.PENDING
            else -> DownloadManagerStatus.UNKNOWN
        }
    }

    private fun inferExtension(url: String): String {
        val clean = url.substringBefore('?').substringBefore('#')
        val ext = clean.substringAfterLast('.', missingDelimiterValue = "")
        if (ext.isBlank() || ext.length > 5) return "mp4"
        return ext.lowercase()
    }

    private fun sanitizeFileName(raw: String): String {
        return raw.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    }
}
