package com.smartifly.tv.domain.provider

interface DeviceProvider {
    fun getDeviceId(): String
    fun getAppVersionCode(): Int
    fun getAppVersionName(): String
    fun getDeviceModel(): String
    fun getOsVersion(): String
    fun getDeviceName(): String

    fun isRooted(): Boolean
    fun isEmulator(): Boolean
    fun isDebuggerConnected(): Boolean
}
