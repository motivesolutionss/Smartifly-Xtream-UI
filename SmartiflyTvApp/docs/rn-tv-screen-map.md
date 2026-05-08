# RN TV Screen Mapping

Source inventory from `SmartiflyApp/src/screens/tv` mapped to native implementation targets.

| React Native Screen | Native Target (initial name) | Priority |
|---|---|---|
| `login/TVLoginScreen.tsx` | `feature/login/TvLoginScreen.kt` | High |
| `profiles/TVProfileSwitcher.tsx` | `feature/profile/TvProfileSwitcherScreen.kt` | High |
| `home/TVHomeScreen.tsx` | `feature/home/TvHomeScreen.kt` | High |
| `home/TVSearchScreen.tsx` | `feature/search/TvSearchScreen.kt` | High |
| `home/TVFavoritesScreen.tsx` | `feature/favorites/TvFavoritesScreen.kt` | Medium |
| `details/TVMovieDetailScreen.tsx` | `feature/details/TvMovieDetailScreen.kt` | High |
| `details/TVSeriesDetailScreen.tsx` | `feature/details/TvSeriesDetailScreen.kt` | High |
| `player/TVPlayerScreen.tsx` | `feature/player/TvPlayerScreen.kt` | High |
| `TVMoviesScreen.tsx` | `feature/movies/TvMoviesScreen.kt` | Medium |
| `TVSeriesScreen.tsx` | `feature/series/TvSeriesScreen.kt` | Medium |
| `TVLiveScreen.tsx` | `feature/live/TvLiveScreen.kt` | Medium |
| `TVAnnouncementsScreen.tsx` | `feature/announcements/TvAnnouncementsScreen.kt` | Low |
| `TVSettingsScreen.tsx` | `feature/settings/TvSettingsScreen.kt` | Medium |
| `TVDownloadsScreen.tsx` | `feature/downloads/TvDownloadsScreen.kt` | Low |

## Critical Components to Rebuild Early
- `home/components/TVContentCard.tsx`
- `home/components/TVContentRail.tsx`
- `home/components/TVSidebar.tsx`
- `player/components/TVPlayerFocusLayer.tsx`
- `player/components/TVPlayerCenterControls.tsx`
- `player/components/TVPlayerBottomControls.tsx`

