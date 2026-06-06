package com.smartifly.tv.performance

import com.smartifly.tv.navigation.Destination
import java.util.concurrent.atomic.AtomicReference

/**
 * Runtime prefetch policy driven by active navigation destination.
 * Active screen gets full budget; non-active screens are restricted.
 */
object PrefetchBudgetController {
    enum class Screen {
        HOME,
        MOVIES,
        SERIES,
        LIVE,
        SEARCH,
        WATCHLIST,
        DETAILS,
        PLAYER,
        SETTINGS
    }

    private val activeScreenRef = AtomicReference(Screen.HOME)

    fun setActiveDestination(destination: Destination) {
        activeScreenRef.set(
            when (destination) {
                Destination.Home -> Screen.HOME
                Destination.Movies -> Screen.MOVIES
                Destination.Series -> Screen.SERIES
                Destination.Live -> Screen.LIVE
                Destination.Search -> Screen.SEARCH
                Destination.Watchlist -> Screen.WATCHLIST
                Destination.Details -> Screen.DETAILS
                Destination.Player -> Screen.PLAYER
                Destination.Settings -> Screen.SETTINGS
            }
        )
    }

    fun activeScreen(): Screen = activeScreenRef.get()

    fun allowAboveFold(screen: Screen): Boolean = activeScreenRef.get() == screen

    fun allowFocusPrefetch(screen: Screen): Boolean = activeScreenRef.get() == screen
}
