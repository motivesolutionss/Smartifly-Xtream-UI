package com.smartifly.tv.features.home

import androidx.activity.ComponentActivity
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.swipeUp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.performance.ImagePreloader
import com.smartifly.tv.performance.RowPrefetchManager
import com.smartifly.tv.ui.components.content.HeroBanner
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalTestApi::class, ExperimentalTvMaterial3Api::class)
class HomeNavigationFocusTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun heroPlayDown_movesFocusToFirstRailTarget() {
        lateinit var heroFocusRequester: FocusRequester
        lateinit var railFocusRequester: FocusRequester

        composeRule.setContent {
            heroFocusRequester = remember { FocusRequester() }
            railFocusRequester = remember { FocusRequester() }

            Column {
                HeroBanner(
                    movie = sampleMovie(),
                    onPlayClick = {},
                    onMoreInfoClick = {},
                    playFocusRequester = heroFocusRequester,
                    firstRailFocusRequester = railFocusRequester
                )
                Spacer(modifier = Modifier.height(8.dp))
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier
                        .focusRequester(railFocusRequester)
                        .focusable()
                        .testTag("rail_target")
                )
            }
        }

        composeRule.runOnIdle {
            heroFocusRequester.requestFocus()
        }

        composeRule.onNodeWithTag("hero_play_button").assertIsFocused().performKeyInput {
            pressKey(Key.DirectionDown)
        }
        composeRule.onNodeWithTag("rail_target").assertIsFocused()
    }

    @Test
    fun firstRailUp_keepsFocusOnFirstItemWhenHeroEscapeIsBlocked() {
        lateinit var firstItemFocusRequester: FocusRequester
        lateinit var heroFocusRequester: FocusRequester

        composeRule.setContent {
            firstItemFocusRequester = remember { FocusRequester() }
            heroFocusRequester = remember { FocusRequester() }

            ContentRow(
                section = HomeSection(
                    title = "Live Channels",
                    items = listOf(sampleMovie(id = "1"), sampleMovie(id = "2"))
                ),
                profileId = "profile-1",
                onMovieClick = {},
                firstItemFocusRequester = firstItemFocusRequester,
                upFocusRequester = heroFocusRequester,
                blockUpToHero = true,
                sidebarFocusRequester = null,
                onMovieFocused = { _, _, _ -> }
            )
        }

        composeRule.runOnIdle {
            firstItemFocusRequester.requestFocus()
        }

        val firstItemTag = homeRowItemTag("Live Channels", 0)
        composeRule.onNodeWithTag(firstItemTag).assertIsFocused().performKeyInput {
            pressKey(Key.DirectionUp)
        }
        composeRule.onNodeWithTag(firstItemTag).assertIsFocused()
    }

    @Test
    fun sidebarReturn_restoresLastFocusedRailItem() {
        lateinit var sidebarFocusRequester: FocusRequester
        lateinit var homeContentFocusRequester: FocusRequester
        var isSidebarExpanded by mutableStateOf(false)

        composeRule.setContent {
            val context = LocalContext.current
            val prefetchManager = remember { RowPrefetchManager(ImagePreloader(context)) }
            sidebarFocusRequester = remember { FocusRequester() }
            homeContentFocusRequester = remember { FocusRequester() }

            Box(
                modifier = Modifier
                    .focusRequester(sidebarFocusRequester)
                    .focusable()
                    .testTag("sidebar_target")
            )

            HomeContent(
                heroMovie = sampleMovie(id = "hero"),
                sections = listOf(
                    HomeSection(
                        title = "Live Channels",
                        items = listOf(sampleMovie(id = "1"), sampleMovie(id = "2"))
                    )
                ),
                isDegraded = false,
                profileId = "profile-1",
                prefetchManager = prefetchManager,
                focusPrefetchEnabled = false,
                sidebarFocusRequester = sidebarFocusRequester,
                screenContentFocusRequester = homeContentFocusRequester,
                isSidebarExpanded = isSidebarExpanded,
                onHeroVisibilityChanged = {},
                onMovieClick = {},
                onPlayClick = {},
                onSearchClick = {},
                onSettingsClick = {},
                onAtmosphereChange = {}
            )
        }

        val firstItemTag = homeRowItemTag("Live Channels", 0)

        composeRule.runOnIdle {
            homeContentFocusRequester.requestFocus()
        }
        composeRule.onNodeWithTag("hero_play_button").assertIsFocused().performKeyInput {
            pressKey(Key.DirectionDown)
        }
        composeRule.onNodeWithTag(firstItemTag).assertIsFocused()

        composeRule.runOnIdle {
            isSidebarExpanded = true
            sidebarFocusRequester.requestFocus()
        }
        composeRule.onNodeWithTag("sidebar_target").assertIsFocused()

        composeRule.runOnIdle {
            isSidebarExpanded = false
        }
        composeRule.waitForIdle()
        composeRule.runOnIdle {
            homeContentFocusRequester.requestFocus()
        }
        composeRule.onNodeWithTag(firstItemTag).assertIsFocused()
    }

    @Test
    fun homeContent_scrollPastThreshold_reportsHeroNotVisible() {
        composeRule.setContent {
            val context = LocalContext.current
            val prefetchManager = remember { RowPrefetchManager(ImagePreloader(context)) }
            var heroVisible by remember { mutableStateOf(true) }

            Box(modifier = Modifier.fillMaxSize()) {
                HomeContent(
                    heroMovie = sampleMovie(id = "hero"),
                    sections = listOf(
                        HomeSection(
                            title = "Live Channels",
                            items = List(8) { index -> sampleMovie(id = "live-$index") }
                        ),
                        HomeSection(
                            title = "New Movies",
                            items = List(8) { index -> sampleMovie(id = "movie-$index") }
                        )
                    ),
                    isDegraded = false,
                    profileId = "profile-1",
                    prefetchManager = prefetchManager,
                    focusPrefetchEnabled = false,
                    sidebarFocusRequester = null,
                    screenContentFocusRequester = null,
                    isSidebarExpanded = false,
                    onHeroVisibilityChanged = { heroVisible = it },
                    onMovieClick = {},
                    onPlayClick = {},
                    onSearchClick = {},
                    onSettingsClick = {},
                    onAtmosphereChange = {}
                )
                Text(
                    text = if (heroVisible) "hero-visible" else "hero-hidden",
                    modifier = Modifier.testTag("hero_visibility_state")
                )
            }
        }

        composeRule.onNodeWithText("hero-visible").assertExists()
        composeRule.onRoot().performTouchInput {
            swipeUp()
            swipeUp()
            swipeUp()
        }
        composeRule.waitUntil(timeoutMillis = 5_000) {
            runCatching {
                composeRule.onNodeWithText("hero-hidden").assertExists()
                true
            }.getOrDefault(false)
        }
        composeRule.onNodeWithText("hero-hidden").assertExists()
    }

    private fun sampleMovie(id: String = "movie-1") = MovieMetadata(
        id = id,
        title = "Sample Movie $id",
        description = "desc",
        year = "2026",
        rating = "8.0",
        duration = "120m",
        posterUrl = "",
        backdropUrl = "",
        type = "movie",
        categoryId = "cat-1",
        badges = listOf("FEATURED"),
        genre = "Action",
        qualityLabel = "HD"
    )
}
