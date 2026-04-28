# Tasks: TV Styling Enhancement

## Overview

Phased approach: start with the surfaces that define the app's premium feel, then form/control consistency, then targeted cleanup of visually broken values only, then validation.

## Tasks

- [x] 1. TVContentCard — premium card styling
  - [x] 1.1 Update focus ring to use `theme.colors.borderFocus` for movie/series cards and `theme.colors.live` for live cards
    - Replace any hardcoded focus ring color literals in `TVContentCard`
    - Verify `ringOpacity` and `ringWidth` animations still use `withTiming(1, 120ms)` / `withSpring`
    - _Requirements: 2.1, 10.2_

  - [x] 1.2 Implement `resolveQualityBadgeColor` using quality theme tokens
    - Map `'4K'`/`'UHD'` → `theme.colors.qualityUHD`, `'HD'`/`'FHD'` → `theme.colors.qualityHD`, `'SD'` → `theme.colors.qualitySD`
    - Fallback to `theme.colors.primary` for unrecognized values
    - _Requirements: 2.2_

  - [x] 1.3 Update rating badge star color to `theme.colors.warning` and card background to `theme.colors.cardBackground`
    - _Requirements: 2.3, 2.4_

  - [x] 1.4 Update glow shadow to use variant-specific `*Glow` tokens (`liveGlow`, `moviesGlow`, `seriesGlow`) gated by `perf.enableFocusGlow`
    - Ensure `shadowOpacity: 0, elevation: 0` when `perf.enableFocusGlow === false`
    - Resolved glow parameters used by the animated style must stay compatible with the current Reanimated focus path
    - Do not increase current effective glow intensity beyond the existing TV-safe shadow budget
    - _Requirements: 2.5, 9.3_

  - [x] 1.5 Standardize live logo presentation
    - Keep white logo surface and padded inner frame
    - Verify mixed logo aspect ratios remain visually balanced — logos must not crop or float awkwardly
    - Verify consistency across Home rails and Live screen grid
    - _Requirements: 2.1, 2.4_

- [x] 2. TVHeroBanner — hero surface styling
  - [x] 2.1 Update Play button focus state to use `theme.colors.accent` background and `theme.colors.textInverse` text via `useAnimatedStyle`
    - Scope: button styling only — do not expand into hero animation refactor
    - Focus state transition must use Reanimated `useSharedValue` / `useAnimatedStyle` (UI thread)
    - _Requirements: 3.5, 9.3_

  - [x] 2.2 Update More Info button to use `theme.colors.glassMedium` background and `theme.colors.borderMedium` border
    - _Requirements: 3.6_

  - [x] 2.3 Update IMDb badge to use `theme.colors.warning` background and `theme.colors.textInverse` text
    - _Requirements: 3.4_

  - [x] 2.4 Update description text to `theme.colors.textTertiary` and metadata/tags to `theme.colors.textSecondary`
    - _Requirements: 3.2, 3.3_

  - [x] 2.5 Update gradient overlay stop colors to use `theme.colors.background` (or `gradients.heroOverlay` stops) instead of hardcoded `'#000000'`
    - _Requirements: 3.7_


- [x] 3. TVSidebar — navigation surface styling
  - [x] 3.1 Update container to use `theme.colors.glassDark` background and `theme.colors.borderMedium` border
    - _Requirements: 4.1_

  - [x] 3.2 Update active indicator to `theme.colors.primary` and active halo to `theme.colors.primary` at 25% opacity
    - _Requirements: 4.2, 4.3_

  - [x] 3.3 Update focused item to use `theme.colors.glass` background and `theme.colors.borderMedium` border
    - _Requirements: 4.4_

  - [x] 3.4 Update icon colors to `theme.colors.iconActive` (focused/active) and `theme.colors.icon` (idle); update label colors to `theme.colors.textSecondary` (idle) and `theme.colors.textPrimary` (focused)
    - _Requirements: 4.5, 4.6_

  - [x] 3.5 Update dividers to use `theme.colors.divider`
    - _Requirements: 4.7_


- [x] 4. Category screens — TVMoviesScreen / TVSeriesScreen / TVLiveScreen
  - [x] 4.1 Update panel title to use `typographyTV.h2` equivalent and `theme.colors.textPrimary`; update title underline to `theme.colors.primary`
    - _Requirements: 5.1, 5.2_

  - [x] 4.2 Implement `buildCategoryItemStyle` for the three item states using theme tokens
    - Idle: `theme.colors.glass` background, `theme.colors.textMuted` text
    - Selected (not focused): `theme.colors.glassMedium` background, `theme.colors.borderMedium` border, `theme.colors.textPrimary` text
    - Focused: `theme.colors.primary` background, `theme.colors.textOnPrimary` text
    - _Requirements: 5.3_

  - [x] 4.3 Update category count to use `theme.colors.textDisabled` (idle) and `theme.colors.textOnPrimary` (focused)
    - _Requirements: 5.4_

  - [x] 4.4 Update grid header to use `typographyTV.h3` for category name and `typographyTV.caption` + `theme.colors.textMuted` for item count
    - _Requirements: 5.5_

  - [x] 4.5 Verify live grid rhythm — column count, horizontal gap, and vertical gap stay balanced with current card size
    - Cards must not visually merge into columns or leave artificial dead space
    - Verify on both HD (1280×720) and FHD (1920×1080) layouts
    - _Requirements: 5.3, 5.5_

  - [x] 4.6 Verify category navigation still filters and displays correct content after styling changes
    - _Requirements: 10.5_

- [x] 5. Phase 1 checkpoint
  - Run typecheck on all touched files
  - Visually verify TVContentCard, TVHeroBanner, TVSidebar, and category screens
  - On TVLiveScreen: verify white live-card surface still looks intentional with mixed logos — cards must not read as empty blocks at distance
  - Switch theme once and confirm all four Phase 1 surfaces re-render with new token values
  - Only escalate to broader testing if layout or interaction changed materially

- [x] 6. TVLoginScreen — form styling
  - [x] 6.1 Update input idle state to use `theme.colors.backgroundInput` background and `theme.colors.border` border
    - _Requirements: 7.1_

  - [x] 6.2 Update input focus state to use `theme.colors.borderFocus` border
    - _Requirements: 7.1_

  - [x] 6.3 Update input error state to use `theme.colors.error` border and `theme.colors.errorBackground` background tint
    - _Requirements: 7.1_

  - [x] 6.4 Update submit button to use `theme.colors.primary` background and `theme.colors.textOnPrimary` text
    - _Requirements: 7.2_

  - [x] 6.5 Update input text to use `typographyTV.input` equivalent sizing and `theme.colors.textPrimary`
    - _Requirements: 7.3_

- [x] 7. TVSettingsScreen — settings surface styling
  - [x] 7.1 Update section headers to use `typographyTV.h3` equivalent and `theme.colors.textPrimary`
    - _Requirements: 8.1_

  - [x] 7.2 Update setting rows to use `theme.colors.backgroundSecondary` background and `theme.colors.border` separator; focused row to `theme.colors.backgroundTertiary`
    - _Requirements: 8.2_

  - [x] 7.3 Update toggle active state to `theme.colors.primary` and inactive to `theme.colors.borderMedium`
    - _Requirements: 8.3_

  - [x] 7.4 Update theme preview card borders to use `theme.colors.borderFocus` (selected) and `theme.colors.border` (unselected)
    - _Requirements: 8.4_

- [x] 8. TVPlayerScreen controls — HUD styling
  - [x] 8.1 Update progress bar fill to `theme.colors.primary`, track to `theme.colors.borderMedium`, and thumb to `theme.colors.accent`
    - _Requirements: 6.1, 6.2_

  - [x] 8.2 Update HUD background to `theme.colors.overlay` and control button focus state to `theme.colors.glass` background / `theme.colors.iconActive` icon
    - _Requirements: 6.3, 6.4_

  - [x] 8.3 Update time labels to `typographyTV.labelSmall` equivalent + `theme.colors.textSecondary`; content title to `typographyTV.h4` equivalent + `theme.colors.textPrimary`
    - _Requirements: 6.5_

- [ ] 9. Phase 2 checkpoint
  - Run typecheck on all touched files
  - Visually verify Login, Settings, and Player HUD
  - Only escalate to broader testing if layout or interaction changed materially

- [ ] 10. Targeted token cleanup — visually broken/inconsistent values only
  - [ ] 10.1 Replace hardcoded color literals only where the value is visually incorrect or inconsistent with the active theme
    - Scope: components touched in Phases 1–2 plus any screen where a hardcoded hex is clearly wrong at runtime
    - Do NOT audit stable screens that are visually correct just for token purity
    - _Requirements: 1.1_

  - [ ] 10.2 Replace raw `fontSize` values only where they cause visible inconsistency (text too large/small relative to surrounding elements)
    - Use `scaleFont(n)` or a `typographyTV` token as the replacement
    - Do NOT replace a local value that is intentional and visually correct
    - _Requirements: 1.2_

  - [ ] 10.3 Replace raw spacing/padding values only where they cause layout issues (overflow, misalignment, uneven rhythm)
    - Use `scale(n)` or a `spacingTV` token as the replacement
    - Do NOT replace values that are intentional and produce correct layout
    - _Requirements: 1.3_

  - [ ] 10.4 Verify card border radii where visually wrong: `borderRadiusTV.md` (8px) for movie/series, `borderRadiusTV.lg` (12px) for live
    - _Requirements: 1.4_

- [ ] 11. Performance validation
  - [ ] 11.1 Verify all `createStyles` calls in modified components are wrapped in `useMemo` with primitive string color values as deps
    - _Requirements: 9.1_

  - [ ] 11.2 Verify no avoidable inline style objects exist in hot-path / frequently rendered modified components
    - Cold-path or genuinely clearer inline styles are acceptable; target performance-sensitive surfaces only
    - _Requirements: 9.2_

  - [ ] 11.3 Verify focus interactions added or changed in this pass use Reanimated `useSharedValue` / `useAnimatedStyle`
    - Existing non-problematic `Animated` usage in unmodified code should not be rewritten just for compliance
    - _Requirements: 9.3_

  - [ ] 11.4 Verify `perf.enableFocusGlow` gate is respected in all glow/shadow applications added or modified in this spec
    - _Requirements: 9.3_

  - [ ] 11.5 Verify no new heavy visual layers (large shadows, stacked overlays, extra composited surfaces) were introduced on hot-path TV surfaces
    - Hot-path surfaces: card grids (`TVContentCard`), sidebar items, hero overlays
    - "Premium" must not silently translate into more blur, glow, or layering than the current TV-safe budget allows

- [ ] 12. Regression verification
  - [ ] 12.1 Verify `TVContentCard` focus ring and zoom animation still work correctly (120ms `withTiming`, `withSpring` damping 18 / stiffness 220)
    - _Requirements: 10.2_

  - [ ] 12.2 Verify `TVHeroBanner` crossfade transition still works with correct visual timing (320ms) — confirm existing behavior, do not rewrite unless broken
    - _Requirements: 10.3_

  - [ ] 12.3 Verify `TVSidebar` expand/collapse animation still works
    - _Requirements: 10.4_

  - [ ] 12.4 Verify theme switching (`setActiveTheme`) causes all modified components to re-render with new token values
    - _Requirements: 11.1_

- [ ] 13. Final checkpoint
  - Run typecheck across all touched files
  - Visually verify all four Phase 1 surfaces one final time
  - Confirm no regressions in focus behavior, animations, or category navigation

## Notes

- Phase 1 (tasks 1–4): high-visibility surfaces that define the premium feel
- Phase 2 (tasks 6–8): form/control consistency
- Phase 3 (task 10): targeted second pass — only fix what is visually broken, not a blanket audit
- Phase 4 (tasks 11–12): performance and regression validation
- Task 12.2 explicitly does NOT rewrite `Animated` → Reanimated unless there is an actual problem
- Task 11.3 applies only to focus interactions added or changed in this pass
- Do not restyle untouched screens unless a shared token change clearly improves them without risk
