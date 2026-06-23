package com.smartifly.tv.data.repository

import com.google.gson.Gson
import com.google.gson.internal.Streams
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import okhttp3.ResponseBody
import java.util.ArrayList

internal object XtreamStreamingListParser {
    private val gson = Gson()

    fun <T> parse(
        rawBody: ResponseBody,
        clazz: Class<T>,
        possibleKeys: List<String> = emptyList(),
        maxItems: Int = Int.MAX_VALUE
    ): List<T> {
        val resolvedMax = maxItems.coerceAtLeast(0)
        if (resolvedMax == 0) {
            rawBody.close()
            return emptyList()
        }

        return try {
            rawBody.use { body ->
                body.charStream().use { stream ->
                    JsonReader(stream).use { reader ->
                        reader.isLenient = true
                        parseRoot(reader, clazz, possibleKeys, resolvedMax)
                    }
                }
            }
        } catch (e: Throwable) {
            android.util.Log.e("XtreamStreamingListParser", "Unexpected EOF or parsing failure in JSON stream", e)
            emptyList()
        }
    }

    private fun <T> parseRoot(
        reader: JsonReader,
        clazz: Class<T>,
        possibleKeys: List<String>,
        maxItems: Int
    ): List<T> {
        return try {
            when (reader.peek()) {
                JsonToken.BEGIN_ARRAY -> parseArray(reader, clazz, maxItems)
                JsonToken.BEGIN_OBJECT -> parseObject(reader, clazz, possibleKeys, maxItems)
                else -> {
                    reader.skipValue()
                    emptyList()
                }
            }
        } catch (e: Throwable) {
            android.util.Log.w("XtreamStreamingListParser", "Unexpected token or EOF at root", e)
            emptyList()
        }
    }

    private fun <T> parseObject(
        reader: JsonReader,
        clazz: Class<T>,
        possibleKeys: List<String>,
        maxItems: Int
    ): List<T> {
        val keys = (possibleKeys + listOf(
            "data", "items", "list", "streams", "channels", "live_streams",
            "vod_streams", "series", "movies", "result", "results"
        )).distinct().toSet()

        var authDenied = false
        var hasError = false

        try {
            reader.beginObject()
            while (reader.hasNext()) {
                val name = reader.nextName()
                when {
                    keys.contains(name) && reader.peek() == JsonToken.BEGIN_ARRAY -> {
                        val parsed = parseArray(reader, clazz, maxItems)
                        consumeObjectTail(reader)
                        return if (authDenied || hasError) emptyList() else parsed
                    }
                    name.equals("auth", ignoreCase = true) -> {
                        authDenied = readIntLike(reader) == 0
                    }
                    name.equals("error", ignoreCase = true) -> {
                        hasError = true
                        reader.skipValue()
                    }
                    else -> reader.skipValue()
                }
            }
            reader.endObject()
        } catch (e: Throwable) {
            android.util.Log.w("XtreamStreamingListParser", "Truncation or malformed JSON object in stream", e)
        }
        return emptyList()
    }

    private fun consumeObjectTail(reader: JsonReader) {
        try {
            while (reader.hasNext()) {
                reader.nextName()
                reader.skipValue()
            }
            reader.endObject()
        } catch (_: Throwable) {
            // Quietly absorb tail EOF or truncation issues
        }
    }

    private fun readIntLike(reader: JsonReader): Int? {
        return try {
            when (reader.peek()) {
                JsonToken.NUMBER -> runCatching { reader.nextInt() }.getOrNull()
                JsonToken.STRING -> reader.nextString().toIntOrNull()
                JsonToken.BOOLEAN -> if (reader.nextBoolean()) 1 else 0
                JsonToken.NULL -> {
                    reader.nextNull()
                    null
                }
                else -> {
                    reader.skipValue()
                    null
                }
            }
        } catch (_: Throwable) {
            null
        }
    }

    private fun <T> parseArray(
        reader: JsonReader,
        clazz: Class<T>,
        maxItems: Int
    ): List<T> {
        val result = ArrayList<T>(minOf(maxItems, 256))
        try {
            reader.beginArray()
            while (reader.hasNext()) {
                if (result.size >= maxItems) {
                    reader.skipValue()
                    continue
                }
                val parsed = try {
                    val element = Streams.parse(reader)
                    gson.fromJson(element, clazz)
                } catch (_: Throwable) {
                    null
                }
                if (parsed != null) {
                    result.add(parsed)
                }
            }
            reader.endArray()
        } catch (e: Throwable) {
            android.util.Log.w(
                "XtreamStreamingListParser",
                "Malformed JSON array or unexpected EOF in stream. Gracefully returning parsed items so far: ${result.size}",
                e
            )
        }
        return result
    }
}
