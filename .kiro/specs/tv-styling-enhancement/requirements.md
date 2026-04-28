# Requirements Document: TV Styling Enhancement

## Introduction

This document derives formal requirements from the `design.md` for the Smartifly TV styling enhancement. The goal is to elevate the visual quality of the TV app to a fully professional standard while keeping performance as the primary constraint. All requirements are grounded in the existing theme system and must not regress any of the performance bugfixes tracked in `tv-performance-issues/bugfix.md`.

---

## Requirements

### 1. Design Token Compliance

#### 1.1 No Hardcoded Color Literals

WHEN any component renders a color value that has a semantic equivalent in `ThemeColors` THEN the system SHALL source that value from the active theme via `useTheme()` or the exported `colors` object, and SHALL NOT use a hardcoded hex, rgba, or named color literal in its place.

**Acceptance Criteria**:
- `TVContentCard`: `liveColor` sourced from `theme.colors.live`, `accentColor` sourced from `theme.colors.borderFocus`
- `TVMoviesScreen`, `TVSeriesScreen`, `TVLiveScreen`: category item focus color sourced from `theme.colors.primary`, text from `theme.colors.textOnPrimary`
- `TVHeroBanner`: title underline, button backgrounds, and badge colors all sourced from theme tokens
- `TVSidebar`: active indicator color sourced from `theme.colors.primary`, container background from `theme.colors.glassDark`
- No component contains a raw hex string (e.g. `'#E50914'`, `'#FFF'`) for a value that exists in `ThemeColors`

#### 1.2 Typography Token Compliance

WHEN any component renders text THEN the system SHALL use a variant from `typographyTV` (or a `scaleFont(n)` call) for `fontSize`, `fontWeight`, `lineHeight`, and `letterSpacing`. No component SHALL use a raw numeric `fontSize` that is not the result of `scaleFont(n)`.

**Acceptance Criteria**:
- Panel titles use `typographyTV.h2` or equivalent `scaleFont` call
- Category item names use `typographyTV.labelMedium` or equivalent
- Badge text uses `typographyTV.badge` (uppercase, bold, wide letter-spacing)
- Hero title uses `typographyTV.displaySmall` or equivalent
- All body/description text uses `typographyTV.bodyMedium` or equivalent

#### 1.3 Spacing Token Compliance

WHEN any component defines padding, margin, or gap values THEN the system SHALL use values from `spacingTV` or `scale(n)` calls. No component SHALL use raw numeric spacing values that are not derived from the scaling system.

**Acceptance Criteria**:
- All `padding*` and `margin*` values in `StyleSheet.create` calls use `scale(n)` or a `spacingTV` token
- No raw pixel values like `padding: 16` without `scale()` wrapping

#### 1.4 Border Radius Token Compliance

WHEN any component defines `borderRadius` THEN the system SHALL use a value from `borderRadiusTV` or `scale(n)`. Card border radii SHALL match the design: `borderRadiusTV.md` (8px) for movie/series cards, `borderRadiusTV.lg` (12px) for live cards.

---

### 2. TVContentCard Styling

#### 2.1 Focus Ring Uses Theme Token

WHEN a content card receives focus THEN the system SHALL render the focus ring using `theme.colors.borderFocus` for movie and series cards, and `theme.colors.live` for live cards.

#### 2.2 Quality Badge Uses Theme Token

WHEN a content card displays a quality badge (HD, 4K, UHD, SD) THEN the system SHALL color the badge text or background using the corresponding quality token:
- `'4K'` or `'UHD'` → `theme.colors.qualityUHD`
- `'HD'` or `'FHD'` → `theme.colors.qualityHD`
- `'SD'` → `theme.colors.qualitySD`

#### 2.3 Rating Badge Uses Theme Token

WHEN a content card displays a star rating THEN the system SHALL use `theme.colors.warning` for the star/rating text color.

#### 2.4 Card Background Uses Theme Token

WHEN a content card renders its background THEN the system SHALL use `theme.colors.cardBackground` as the base background color.

#### 2.5 Glow Effect Gated by Perf Profile

WHEN a content card is focused AND `perf.enableFocusGlow === false` THEN the system SHALL NOT apply any `shadowOpacity > 0` or `elevation > 0` to the card.

WHEN a content card is focused AND `perf.enableFocusGlow === true` THEN the system SHALL apply a glow shadow using the appropriate `*Glow` token from the active theme (`theme.colors.liveGlow`, `theme.colors.moviesGlow`, or `theme.colors.seriesGlow`).

---

### 3. TVHeroBanner Styling

#### 3.1 Title Typography

WHEN the hero banner renders the content title THEN the system SHALL use `scaleFont(64)` or `typographyTV.displaySmall` equivalent for font size, with `fontWeight: '700'` and `textShadowColor: 'rgba(0,0,0,0.8)'` for legibility over backdrop images.

#### 3.2 Description Typography

WHEN the hero banner renders the description text THEN the system SHALL use `typographyTV.bodyMedium` equivalent and `theme.colors.textTertiary` for color.

#### 3.3 Metadata and Tags Typography

WHEN the hero banner renders year, rating, or genre tags THEN the system SHALL use `typographyTV.labelMedium` equivalent and `theme.colors.textSecondary` for color.

#### 3.4 IMDb Rating Badge

WHEN the hero banner renders an IMDb rating THEN the system SHALL use `theme.colors.warning` as the badge background and `theme.colors.textInverse` as the text color.

#### 3.5 Play Button Focus State

WHEN the Play button in the hero banner receives focus THEN the system SHALL transition its background color to `theme.colors.accent` (white) and its text/icon color to `theme.colors.textInverse` (dark), using a Reanimated `useAnimatedStyle` on the UI thread.

#### 3.6 More Info Button Styling

WHEN the More Info button renders THEN the system SHALL use `theme.colors.glassMedium` as background and `theme.colors.borderMedium` as border color in its idle state.

#### 3.7 Gradient Overlays Use Gradient Tokens

WHEN the hero banner renders its left-fade and bottom-fade gradient overlays THEN the system SHALL use stop colors derived from `theme.colors.background` (or `gradients.heroOverlay` stops) rather than hardcoded `'#000000'` literals.

---

### 4. TVSidebar Styling

#### 4.1 Container Uses Glass Token

WHEN the sidebar renders its container THEN the system SHALL use `theme.colors.glassDark` as the base background color and `theme.colors.borderMedium` as the border color.

#### 4.2 Active Indicator Uses Primary Token

WHEN a sidebar menu item is the active route THEN the system SHALL render the left-edge active indicator using `theme.colors.primary` as its color.

#### 4.3 Active Halo Uses Primary Token

WHEN a sidebar menu item is the active route THEN the system SHALL render the icon halo using `theme.colors.primary` at 25% opacity (`rgba` derived from `theme.colors.primary`).

#### 4.4 Focused Item Uses Glass Token

WHEN a sidebar menu item receives focus THEN the system SHALL apply `theme.colors.glass` as background and `theme.colors.borderMedium` as border color.

#### 4.5 Icon Colors Use Theme Tokens

WHEN a sidebar icon renders THEN the system SHALL use `theme.colors.iconActive` for focused/active state and `theme.colors.icon` for idle state.

#### 4.6 Label Typography Uses Theme Tokens

WHEN a sidebar label renders THEN the system SHALL use `theme.colors.textSecondary` for idle state and `theme.colors.textPrimary` for focused state, with `typographyTV.labelMedium` equivalent sizing.

#### 4.7 Dividers Use Divider Token

WHEN the sidebar renders horizontal dividers THEN the system SHALL use `theme.colors.divider` as the divider color.

---

### 5. Category Screen Styling (Movies / Series / Live)

#### 5.1 Panel Title Uses Typography Token

WHEN a category screen renders its panel title (e.g. "Movies", "Series", "Live TV") THEN the system SHALL use `typographyTV.h2` equivalent sizing and `theme.colors.textPrimary` for color.

#### 5.2 Title Underline Uses Primary Token

WHEN a category screen renders the decorative underline beneath the panel title THEN the system SHALL use `theme.colors.primary` as the underline color.

#### 5.3 Category Item States Use Theme Tokens

WHEN a category item renders in its idle state THEN the system SHALL use `theme.colors.glass` as background and `theme.colors.textMuted` as text color.

WHEN a category item is selected but not focused THEN the system SHALL use `theme.colors.glassMedium` as background, `theme.colors.borderMedium` as border, and `theme.colors.textPrimary` as text color.

WHEN a category item receives focus THEN the system SHALL use `theme.colors.primary` as background and `theme.colors.textOnPrimary` as text color.

#### 5.4 Category Count Uses Theme Tokens

WHEN a category item renders its item count THEN the system SHALL use `theme.colors.textDisabled` in idle state and `theme.colors.textOnPrimary` in focused state.

#### 5.5 Grid Header Uses Typography Tokens

WHEN a category screen renders the grid header (selected category name + item count) THEN the system SHALL use `typographyTV.h3` equivalent for the category name and `typographyTV.caption` + `theme.colors.textMuted` for the item count.

---

### 6. Player Screen Styling

#### 6.1 Progress Bar Uses Theme Tokens

WHEN the video player renders the progress bar THEN the system SHALL use `theme.colors.primary` for the filled/elapsed portion and `theme.colors.borderMedium` for the track background.

#### 6.2 Progress Thumb Uses Accent Token

WHEN the video player renders the progress bar thumb/scrubber THEN the system SHALL use `theme.colors.accent` (white) as the thumb color.

#### 6.3 HUD Background Uses Overlay Token

WHEN the player HUD overlay renders THEN the system SHALL use `theme.colors.overlay` as the background color.

#### 6.4 Control Button Focus Uses Glass Token

WHEN a player control button receives focus THEN the system SHALL use `theme.colors.glass` as background and `theme.colors.iconActive` as icon color.

#### 6.5 Time and Title Text Use Typography Tokens

WHEN the player HUD renders time labels THEN the system SHALL use `typographyTV.labelSmall` equivalent and `theme.colors.textSecondary`.

WHEN the player HUD renders the content title THEN the system SHALL use `typographyTV.h4` equivalent and `theme.colors.textPrimary`.

---

### 7. Login Screen Styling

#### 7.1 Input Fields Use Theme Tokens

WHEN a login input field renders in idle state THEN the system SHALL use `theme.colors.backgroundInput` as background and `theme.colors.border` as border color.

WHEN a login input field receives focus THEN the system SHALL use `theme.colors.borderFocus` as border color.

WHEN a login input field has a validation error THEN the system SHALL use `theme.colors.error` as border color and `theme.colors.errorBackground` as a background tint.

#### 7.2 Submit Button Uses Primary Token

WHEN the login submit button renders THEN the system SHALL use `theme.colors.primary` as background and `theme.colors.textOnPrimary` as text color.

#### 7.3 Input Text Uses Typography Token

WHEN a login input field renders text THEN the system SHALL use `typographyTV.input` equivalent sizing and `theme.colors.textPrimary` for color.

---

### 8. Settings Screen Styling

#### 8.1 Section Headers Use Typography Tokens

WHEN the settings screen renders a section header THEN the system SHALL use `typographyTV.h3` equivalent and `theme.colors.textPrimary`.

#### 8.2 Setting Rows Use Background Tokens

WHEN a settings row renders THEN the system SHALL use `theme.colors.backgroundSecondary` as background and `theme.colors.border` as separator color.

WHEN a settings row receives focus THEN the system SHALL use `theme.colors.backgroundTertiary` as background.

#### 8.3 Toggle States Use Theme Tokens

WHEN a settings toggle is active THEN the system SHALL use `theme.colors.primary` as the toggle track color.

WHEN a settings toggle is inactive THEN the system SHALL use `theme.colors.borderMedium` as the toggle track color.

#### 8.4 Theme Preview Cards Use Border Tokens

WHEN the settings screen renders theme preview cards THEN the system SHALL use `theme.colors.borderFocus` as the border for the currently selected theme and `theme.colors.border` for unselected themes.

---

### 9. Performance Constraints

#### 9.1 No StyleSheet Creation Per Render

WHEN any component re-renders without a change in theme color values THEN the system SHALL NOT call `StyleSheet.create` again. All `createStyles` functions SHALL be wrapped in `useMemo` with primitive string color values as dependencies.

#### 9.2 No Inline Style Objects in JSX

WHEN any component renders JSX THEN the system SHALL NOT use inline style objects (e.g. `style={{ color: theme.colors.primary }}`) in the `style` prop of any element that is rendered more than once per frame. All styles SHALL be defined in `StyleSheet.create` calls.

#### 9.3 Animations Remain on UI Thread

WHEN any focus animation (ring, zoom, glow, button highlight) runs THEN the system SHALL execute it entirely on the UI thread using Reanimated `useSharedValue` and `useAnimatedStyle`. No `Animated` API from React Native core SHALL be used for focus effects.

#### 9.4 No New Third-Party Dependencies

WHEN implementing styling changes THEN the system SHALL NOT introduce any new npm packages. All visual improvements SHALL use existing primitives: Reanimated, React Native `StyleSheet`, the existing theme system, and `tvScaling.ts`.

#### 9.5 Scale Functions Used for All Dimensions

WHEN any component defines a dimension (width, height, padding, margin, border radius, font size) THEN the system SHALL derive that value using `scale(n)`, `scaleFont(n)`, `scaleX(n)`, or `scaleY(n)` from `tvScaling.ts`, or a pre-computed token from `spacingTV`, `borderRadiusTV`, or `tvTypography`.

---

### 10. Regression Prevention

#### 10.1 Performance Bugfixes Must Not Regress

WHEN styling changes are applied THEN the system SHALL preserve all behaviors specified in `tv-performance-issues/bugfix.md`. Specifically:

- Issue 1: `createStyles` in `TVContentCard` SHALL NOT be called when the theme object reference changes but color values are unchanged
- Issue 2: Hero crossfade animations in `TVHeroBanner` SHALL remain on the UI thread (Reanimated only, no `Animated` API for crossfade)
- Issue 3: `HomeSection` memoization SHALL NOT be broken by styling changes
- Issue 8: `focusTargets` state in `TVHomeScreen` SHALL NOT be updated by styling-related focus events

#### 10.2 Focus Ring Behavior Preserved

WHEN a content card receives focus THEN the system SHALL CONTINUE TO display the focus ring animation and scale zoom effect with the same timing (120ms `withTiming`, `withSpring` with `damping: 18, stiffness: 220`).

#### 10.3 Hero Banner Crossfade Preserved

WHEN the hero banner transitions between items THEN the system SHALL CONTINUE TO show the crossfade transition with the same visual timing (320ms) and appearance.

#### 10.4 Sidebar Expand/Collapse Preserved

WHEN the sidebar receives or loses focus THEN the system SHALL CONTINUE TO animate width between collapsed (`scale(96)`) and expanded (`scale(285)`) states using the existing spring configuration.

#### 10.5 Category Navigation Preserved

WHEN a user selects a category in Movies, Series, or Live screens THEN the system SHALL CONTINUE TO filter and display the correct content grid with the same layout and interaction behavior.

---

### 11. Theme Reactivity

#### 11.1 All Components React to Theme Changes

WHEN `setActiveTheme(themeId)` is called THEN all components that consume `useTheme()` SHALL re-render with the new color values within one React commit cycle.

#### 11.2 Theme Fallback Safety

WHEN a theme token is `undefined` or an empty string (e.g. due to a missing key in a custom theme) THEN the system SHALL fall back to the corresponding `defaultTheme` value for that token, preventing blank or invisible UI elements.

#### 11.3 Theme ID Validation

WHEN a theme ID is loaded from persistent storage THEN the system SHALL validate it against `themeRegistry` keys and fall back to `defaultThemeId` if the ID is not recognized.
