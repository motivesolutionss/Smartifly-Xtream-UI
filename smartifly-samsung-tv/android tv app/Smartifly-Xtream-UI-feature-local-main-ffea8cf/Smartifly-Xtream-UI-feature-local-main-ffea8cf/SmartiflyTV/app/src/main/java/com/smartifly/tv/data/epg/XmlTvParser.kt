package com.smartifly.tv.data.epg

import android.util.Xml
import com.smartifly.tv.features.live.epg.EpgProgram
import org.xmlpull.v1.XmlPullParser
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class XmlTvParser {
    private val dateFormat = SimpleDateFormat("yyyyMMddHHmmss Z", Locale.US)

    fun parse(inputStream: InputStream): List<EpgProgram> {
        val parser = Xml.newPullParser()
        parser.setInput(inputStream, null)
        
        val programs = mutableListOf<EpgProgram>()
        var eventType = parser.eventType
        
        while (eventType != XmlPullParser.END_DOCUMENT) {
            val name = parser.name
            when (eventType) {
                XmlPullParser.START_TAG -> {
                    if (name == "programme") {
                        programs.add(parseProgramme(parser))
                    }
                }
            }
            eventType = parser.next()
        }
        return programs
    }

    private fun parseProgramme(parser: XmlPullParser): EpgProgram {
        val start = parser.getAttributeValue(null, "start")
        val end = parser.getAttributeValue(null, "stop")
        val channel = parser.getAttributeValue(null, "channel")
        
        var title = ""
        var description = ""
        
        var eventType = parser.next()
        while (!(eventType == XmlPullParser.END_TAG && parser.name == "programme")) {
            if (eventType == XmlPullParser.START_TAG) {
                when (parser.name) {
                    "title" -> title = readText(parser)
                    "desc" -> description = readText(parser)
                }
            }
            eventType = parser.next()
        }
        
        return EpgProgram(
            id = "${channel}_${start}",
            title = title,
            startTime = parseDate(start),
            endTime = parseDate(end),
            description = description,
            channelId = channel
        )
    }

    private fun readText(parser: XmlPullParser): String {
        var result = ""
        if (parser.next() == XmlPullParser.TEXT) {
            result = parser.text
            parser.nextTag()
        }
        return result
    }

    private fun parseDate(dateStr: String): Long {
        return try {
            dateFormat.parse(dateStr)?.time ?: 0L
        } catch (e: Exception) {
            0L
        }
    }
}
