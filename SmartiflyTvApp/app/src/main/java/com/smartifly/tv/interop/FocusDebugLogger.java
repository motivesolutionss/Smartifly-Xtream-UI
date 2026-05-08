package com.smartifly.tv.interop;

import android.util.Log;

public final class FocusDebugLogger {
    private static final String TAG = "SmartiflyTvFocus";

    private FocusDebugLogger() {
        // Utility class
    }

    public static void logFocus(String target, boolean focused) {
        Log.d(TAG, target + " focused=" + focused);
    }
}

