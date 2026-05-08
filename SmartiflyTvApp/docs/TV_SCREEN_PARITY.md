# Smartifly TV Screen Parity (RN -> Kotlin)

## Purpose
This document defines TV migration divisions and the parity status between:
- `SmartiflyApp` (React Native TV)
- `SmartiflyTvApp` (Kotlin/Compose TV)

## Division Structure

### Login
- RN: `src/screens/tv/login/*`
- Kotlin: `feature/login/*`

### Home And Browse
- RN: `src/screens/tv/home/*`, `TVLiveScreen.tsx`, `TVMoviesScreen.tsx`, `TVSeriesScreen.tsx`
- Kotlin: `feature/home/*` and `feature/home/components/*`

### Player
- RN: `src/screens/tv/player/*`
- Kotlin: `feature/player/*`

### Detail
- RN: `src/screens/tv/details/*`
- Kotlin: `feature/home/components/ContentDetailScreen.kt`

### Profiles And Accounts
- RN: `src/screens/tv/profiles/*`, `src/screens/tv/account/*`
- Kotlin: `feature/profile/*`

### Utility Screens
- RN: `TVAnnouncementsScreen.tsx`, `TVDownloadsScreen.tsx`, `TVSettingsScreen.tsx`, `loading/TVLoadingScreen.tsx`
- Kotlin: mostly merged under `HomeShellScreen` tabs

## Screen Mapping

| RN TV Screen | Kotlin TV Equivalent | Status | Notes |
|---|---|---|---|
| `TVLoginScreen.tsx` | `feature/login/LoginScreen.kt` | Partial | UI parity in progress, auth flow and key handling active |
| `home/TVHomeScreen.tsx` | `feature/home/HomeShellScreen.kt` | Partial | Main shell implemented |
| `TVLiveScreen.tsx` | `HomeTab.LIVE` in `HomeShellScreen.kt` | Partial | Added as dedicated tab division |
| `TVMoviesScreen.tsx` | `HomeTab.MOVIES` in `HomeShellScreen.kt` | Partial | Added as dedicated tab division |
| `TVSeriesScreen.tsx` | `HomeTab.SERIES` in `HomeShellScreen.kt` | Partial | Added as dedicated tab division |
| `home/TVSearchScreen.tsx` | `HomeTab.SEARCH` in `HomeShellScreen.kt` | Partial | Keyboard + results implemented |
| `home/TVFavoritesScreen.tsx` | `HomeTab.FAVORITES` in `HomeShellScreen.kt` | Partial | Grid and remove implemented |
| `TVDownloadsScreen.tsx` | `HomeTab.DOWNLOADS` in `HomeShellScreen.kt` | Partial | Queue/status actions implemented |
| `TVSettingsScreen.tsx` | `HomeTab.SETTINGS` in `HomeShellScreen.kt` | Partial | Account/player/settings controls implemented |
| `TVAnnouncementsScreen.tsx` | `HomeTab.ANNOUNCEMENTS` in `HomeShellScreen.kt` | Partial | Division created, backend wiring pending |
| `details/TVMovieDetailScreen.tsx` | `MovieDetailScreen` in `ContentDetailScreen.kt` | Partial | Core flow implemented |
| `details/TVSeriesDetailScreen.tsx` | `SeriesDetailScreen` in `ContentDetailScreen.kt` | Partial | Core flow implemented |
| `player/TVPlayerScreen.tsx` | `feature/player/TvPlayerScreen.kt` | Partial | Player parity in progress |
| `profiles/TVProfileSwitcher.tsx` | `feature/profile/ProfileSwitcherScreen.kt` | Partial | Functional, style parity pending |
| `profiles/TVProfileEditor.tsx` | N/A | Missing | Not migrated yet |
| `profiles/TVPinEntry.tsx` | N/A | Missing | Not migrated yet |
| `account/TVAccountSwitcherScreen.tsx` | N/A | Missing | Not migrated yet |
| `loading/TVLoadingScreen.tsx` | N/A | Missing | Not migrated yet |

## Current Focus
1. Preserve RN TV screen divisions in Kotlin navigation/tabs.
2. Apply RN theme tokens and spacing across each division.
3. Close remaining gaps for account/profile editor/PIN/loading/announcements backend.
