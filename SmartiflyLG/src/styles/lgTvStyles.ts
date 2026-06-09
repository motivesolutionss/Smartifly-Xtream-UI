import type { CSSProperties } from 'react';

export function mergeStyle(...styles: Array<CSSProperties | false | undefined | null>): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

/** Hide scrollbars while keeping scroll (pair with `.lg-details-scroll` / `.lg-details-scroll-x` in index.html for WebKit). */
export const hideScrollbar: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none'
};

export const contentScreen: CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box'
};

export const eyebrow: CSSProperties = {
  margin: 0,
  color: '#ff6675',
  fontSize: '13px',
  fontWeight: 800,
  letterSpacing: '1.8px',
  textTransform: 'uppercase'
};

export const heroCopy: CSSProperties = {
  margin: 0,
  maxWidth: '880px',
  color: 'rgba(231, 236, 244, 0.7)',
  fontSize: '18px',
  lineHeight: 1.55
};

export const placeholderScreen: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  gap: '28px',
  overflowY: 'auto',
  padding: '64px',
  boxSizing: 'border-box'
};

export const placeholderTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '64px',
  lineHeight: 0.96,
  letterSpacing: '-1.4px',
  fontWeight: 800
};

/** webOS-safe browse shell (flex, not grid/minmax/gap). */
export const browseScreenBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  padding: '30px 28px 24px 24px',
  background:
    'linear-gradient(90deg, rgba(3, 4, 7, 0.98) 0%, rgba(3, 4, 7, 0.98) 100%), radial-gradient(circle at 45% 10%, rgba(229, 9, 20, 0.08), transparent 26%)',
  boxSizing: 'border-box'
};

export const browseSidebar: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '320px',
  flex: '0 0 320px',
  marginRight: '28px',
  minWidth: 0,
  minHeight: 0,
  paddingTop: 0,
  overflow: 'hidden',
  boxSizing: 'border-box'
};

export const browseSidebarHeader: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  marginBottom: '16px'
};

export const browseLabel: CSSProperties = {
  margin: 0,
  color: '#ff2438',
  fontSize: '18px',
  fontWeight: 900,
  letterSpacing: '1.5px',
  textTransform: 'uppercase'
};

export const browseCategories: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 16px 24px',
  flex: '1 1 auto',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  boxSizing: 'border-box',
  ...hideScrollbar
};

export const browseCategory: CSSProperties = {
  border: 0,
  padding: '22px 24px',
  borderRadius: '18px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  textAlign: 'left',
  fontSize: '22px',
  fontWeight: 700,
  width: '100%',
  flexShrink: 0,
  marginBottom: '12px',
  boxSizing: 'border-box',
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const browseCategoryActive: CSSProperties = {
  background: '#f4f4f4',
  color: '#111318',
  boxShadow: '0 18px 30px rgba(0, 0, 0, 0.26)'
};

export const browseCategoryCount: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.34)',
  fontSize: '17px',
  fontWeight: 700
};

export const browseCategoryCountActive: CSSProperties = {
  color: 'rgba(0, 0, 0, 0.45)'
};

export function getCategoryItemStyle(isFocused: boolean, isSelected: boolean): CSSProperties {
  return {
    border: 0,
    borderRadius: '14px',
    padding: '16px 20px',
    background: isFocused 
      ? '#ffffff' 
      : isSelected 
      ? 'rgba(255, 255, 255, 0.08)' 
      : 'rgba(255, 255, 255, 0.02)',
    color: isFocused ? '#07090e' : 'rgba(255, 255, 255, 0.62)',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexShrink: 0,
    marginBottom: '12px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
    transform: isFocused ? 'scale(1.03) translate3d(2px, 0, 0)' : 'none',
    boxShadow: isFocused 
      ? '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255,255,255,0.1)' 
      : 'none',
    transition: 'background 180ms ease, color 180ms ease, transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 180ms ease',
    WebkitAppearance: 'none',
    appearance: 'none'
  };
}

export const browseContent: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '18px',
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
  boxSizing: 'border-box'
};

export const browseContentHeader: CSSProperties = {
  flex: '0 0 auto',
  marginBottom: '20px'
};

export const browseGridHeader: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  boxSizing: 'border-box'
};

export const browseGridHeaderHint: CSSProperties = {
  margin: 0,
  marginLeft: '16px',
  flexShrink: 0
};

export const browseGridTitle: CSSProperties = {
  margin: '6px 0 0',
  color: '#ffffff',
  fontSize: '34px',
  lineHeight: 1.05,
  fontWeight: 800
};

export const browseMeta: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  marginTop: '6px',
  color: 'rgba(255, 255, 255, 0.62)',
  fontSize: '14px',
  fontWeight: 700
};

export const browseMetaItem: CSSProperties = {
  marginRight: '12px'
};

export const browseHint: CSSProperties = {
  margin: 0,
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '14px',
  flexShrink: 0
};

export const browseGridScroll: CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  padding: '10px 0 0',
  boxSizing: 'border-box',
  ...hideScrollbar
};

/** Flex wrap grid for movie/series cards (no CSS grid on webOS). */
export const browseGrid: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  alignContent: 'flex-start',
  padding: '18px 22px 22px 26px',
  overflow: 'hidden',
  boxSizing: 'border-box'
};

export const liveGrid: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  alignContent: 'flex-start',
  padding: '18px 22px 22px 26px',
  overflow: 'hidden',
  boxSizing: 'border-box'
};

export const liveGridScroll: CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  padding: 0,
  boxSizing: 'border-box',
  ...hideScrollbar
};

export const browseLoading: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  minHeight: '240px',
  color: 'rgba(255, 255, 255, 0.72)',
  fontSize: '16px',
  fontWeight: 700
};

export const browseLoadingSpinner: CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '999px',
  border: '4px solid rgba(255, 255, 255, 0.08)',
  borderTopColor: '#e50914',
  animation: 'spin 1.05s linear infinite'
};

/** Portrait tiles — 5 per row @ 1080p, ~3 rows visible (live uses wider 16:9 tiles). */
export const BROWSE_POSTER_CARD_WIDTH = 248;
export const BROWSE_POSTER_CARD_ART_HEIGHT = 372;

export const BROWSE_LIVE_CARD_WIDTH = 318;
export const BROWSE_LIVE_CARD_ART_HEIGHT = 178;

export const movieCard: CSSProperties = {
  border: 0,
  padding: 0,
  borderRadius: '20px',
  background: 'transparent',
  overflow: 'hidden',
  color: '#ffffff',
  textAlign: 'left',
  outline: 'none',
  cursor: 'pointer',
  position: 'relative',
  width: `${BROWSE_POSTER_CARD_WIDTH}px`,
  marginRight: '16px',
  marginBottom: '16px',
  flexShrink: 0,
  display: 'block',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const movieCardActive: CSSProperties = {
  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.92), 0 14px 28px rgba(0, 0, 0, 0.35)'
};

export const movieCardArt: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: `${BROWSE_POSTER_CARD_ART_HEIGHT}px`,
  borderRadius: '20px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)'
};

export const movieCardImg: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block'
};

export const movieCardFallback: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  boxSizing: 'border-box'
};

export const movieCardFallbackStrong: CSSProperties = {
  color: '#ffffff',
  maxWidth: '100%',
  fontSize: '28px',
  lineHeight: 1.08,
  fontWeight: 900,
  letterSpacing: '-0.4px',
  wordBreak: 'break-word',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 4,
  textAlign: 'left'
};

export const movieCardFallbackSpan: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.82)',
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase'
};

export const cardDebugOverlay: CSSProperties = {
  display: 'none',
  position: 'absolute',
  left: '10px',
  right: '10px',
  bottom: '10px',
  flexDirection: 'column',
  gap: '3px',
  padding: '8px 10px',
  borderRadius: '12px',
  background: 'rgba(3, 5, 8, 0.82)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.88)',
  fontFamily: '"Roboto Mono", "Consolas", monospace',
  fontSize: '10px',
  lineHeight: 1.3,
  textAlign: 'left',
  wordBreak: 'break-all',
  zIndex: 2,
  pointerEvents: 'none',
  boxSizing: 'border-box'
};

export const liveChannelCard: CSSProperties = {
  border: 0,
  padding: 0,
  borderRadius: '24px',
  background: 'transparent',
  overflow: 'hidden',
  color: '#ffffff',
  textAlign: 'left',
  outline: 'none',
  cursor: 'pointer',
  position: 'relative',
  width: `${BROWSE_LIVE_CARD_WIDTH}px`,
  marginRight: '16px',
  marginBottom: '16px',
  flexShrink: 0,
  display: 'block',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const liveChannelCardActive: CSSProperties = {
  boxShadow: '0 0 0 3px rgba(229, 9, 20, 0.96), 0 14px 28px rgba(0, 0, 0, 0.35)'
};

export const liveChannelCardArt: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: `${BROWSE_LIVE_CARD_ART_HEIGHT}px`,
  borderRadius: '24px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)'
};

export const liveChannelCardImg: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  display: 'block',
  padding: '8px',
  background: 'rgba(255, 255, 255, 0.98)',
  boxSizing: 'border-box'
};

export const searchScreen: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '520px minmax(0, 1fr)',
  gap: '28px',
  minHeight: '100%',
  padding: '30px 28px 24px 24px',
  background:
    'linear-gradient(90deg, rgba(3, 4, 7, 0.98) 0%, rgba(3, 4, 7, 0.98) 100%), radial-gradient(circle at 45% 10%, rgba(229, 9, 20, 0.08), transparent 26%)',
  boxSizing: 'border-box'
};

export const searchSidebar: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '30px',
  height: '100%',
  minWidth: 0,
  paddingRight: '6px',
  boxSizing: 'border-box',
  overflow: 'hidden'
};

export const searchHeader: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

export const searchTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '34px',
  lineHeight: 1.04,
  fontWeight: 800,
  letterSpacing: '-0.8px'
};

export const searchCopy: CSSProperties = {
  margin: 0,
  maxWidth: '300px',
  color: 'rgba(255, 255, 255, 0.62)',
  fontSize: '15px',
  lineHeight: 1.5
};

export const searchInputShell: CSSProperties = {
  borderRadius: '24px',
  padding: '2px',
  background: 'rgba(255, 255, 255, 0.05)',
  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.25)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxSizing: 'border-box',
  transition: 'all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)'
};

export const searchInput: CSSProperties = {
  width: '100%',
  minHeight: '74px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '20px',
  padding: '0 20px',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(231, 236, 244, 0.72)',
  fontSize: '19px',
  fontWeight: 700,
  outline: 'none',
  textAlign: 'left',
  boxSizing: 'border-box',
  transition: 'all 0.22s ease'
};

export const searchInputFocused: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#ffffff',
  borderColor: '#ff2438',
  boxShadow: '0 0 24px rgba(255, 36, 56, 0.4)'
};

export const searchHelper: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '16px',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255, 255, 255, 0.45)',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  marginTop: '4px'
};

export const searchHelperAccent: CSSProperties = {
  color: '#ff2438',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

export const searchSidebarBack: CSSProperties = {
  marginTop: 'auto',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '18px',
  minHeight: '54px',
  padding: '0 20px',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'rgba(255, 255, 255, 0.88)',
  fontSize: '16px',
  fontWeight: 700,
  textAlign: 'center',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'all 0.18s ease'
};

export const searchSidebarBackFocused: CSSProperties = {
  background: '#ffffff',
  color: '#0b1018',
  borderColor: '#ffffff',
  transform: 'scale(1.03)',
  boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 8px 24px rgba(0, 0, 0, 0.45)'
};

export const searchResults: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  padding: '20px 24px 24px',
  overflowY: 'auto',
  boxSizing: 'border-box'
};

export const searchEmpty: CSSProperties = {
  minHeight: '300px',
  borderRadius: '26px',
  padding: '34px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  background: 'rgba(12, 15, 20, 0.72)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
  boxSizing: 'border-box'
};

export const searchEmptyTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '32px',
  lineHeight: 1.05,
  fontWeight: 800
};

export const searchEmptyCopy: CSSProperties = {
  margin: '12px 0 0',
  maxWidth: '420px',
  color: 'rgba(255, 255, 255, 0.64)',
  fontSize: '16px',
  lineHeight: 1.52
};

export const searchRail: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

export const searchRailEmpty: CSSProperties = {
  padding: '20px 22px',
  borderRadius: '18px',
  background: 'rgba(18, 20, 26, 0.8)',
  color: 'rgba(255, 255, 255, 0.64)',
  fontSize: '14px',
  fontWeight: 700
};

export const searchRailTrack: CSSProperties = {
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '270px',
  gap: '18px',
  alignItems: 'start',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '24px 20px',
  margin: '-12px -20px -24px -20px',
  boxSizing: 'border-box',
  ...hideScrollbar
};

export const searchRailCard: CSSProperties = {
  border: 0,
  padding: 0,
  borderRadius: '20px',
  background: 'transparent',
  color: '#ffffff',
  textAlign: 'left',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)'
};

export const searchRailCardActive: CSSProperties = {
  transform: 'translateY(-6px) scale(1.05)',
  boxShadow: '0 22px 48px rgba(0, 0, 0, 0.5), 0 0 0 3px #ffffff'
};

export const searchRailCardLive: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

export const searchRailCardCopy: CSSProperties = {
  padding: '12px 4px 0'
};

export const searchRailCardCopyLive: CSSProperties = {
  paddingTop: '2px'
};

export const searchRailCardTitle: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  color: '#ffffff',
  fontSize: '15px',
  lineHeight: 1.25,
  fontWeight: 700
};

export const searchRailCardMeta: CSSProperties = {
  display: 'flex',
  gap: '10px',
  marginTop: '6px',
  color: 'rgba(255, 255, 255, 0.54)',
  fontSize: '12px',
  fontWeight: 700
};

export const tvKeyboard: CSSProperties = {
  width: '100%',
  maxWidth: '920px',
  padding: '16px',
  borderRadius: '20px',
  background: 'rgba(11, 15, 24, 0.65)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  boxSizing: 'border-box'
};

export const tvKeyboardRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
  gap: '6px',
  marginTop: '6px',
  boxSizing: 'border-box'
};

export const tvKey: CSSProperties = {
  minHeight: '60px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'rgba(255, 255, 255, 0.88)',
  fontSize: '16px',
  fontWeight: 700,
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'all 0.18s ease'
};

export const tvKeyAccent: CSSProperties = {
  background: 'rgba(229, 9, 20, 0.15)',
  borderColor: 'rgba(229, 9, 20, 0.3)',
  color: '#ff6675'
};

export const tvKeyFocused: CSSProperties = {
  transform: 'scale(1.08)',
  boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 8px 24px rgba(0, 0, 0, 0.45)',
  background: '#ffffff',
  color: '#0b1018',
  borderColor: '#ffffff'
};

export const tvKeyAccentFocused: CSSProperties = {
  transform: 'scale(1.08)',
  background: 'linear-gradient(135deg, #ff2438 0%, #b20710 100%)',
  color: '#ffffff',
  borderColor: '#ffffff',
  boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.95), 0 8px 24px rgba(229, 9, 20, 0.35)'
};

export function tvKeySpanStyle(span?: number): CSSProperties {
  if (!span) {
    return {};
  }
  return { gridColumn: `span ${span}` };
}

/** webOS-safe absolute fill (no `inset`) */
const fillAbsolute: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

export const detailsScreen: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  maxWidth: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: '24px 28px 32px 24px',
  background: '#020306',
  boxSizing: 'border-box',
  ...hideScrollbar
};

export const DETAILS_HERO_SHELL_BACKGROUND =
  'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255, 255, 255, 0.04), transparent 55%), radial-gradient(ellipse 120% 90% at 50% 100%, rgba(229, 9, 20, 0.05), transparent 42%), linear-gradient(180deg, #0a0c10 0%, #040507 48%, #020306 100%)';

export const detailsHero: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  minHeight: '720px',
  marginBottom: '28px',
  borderRadius: '28px',
  background: DETAILS_HERO_SHELL_BACKGROUND,
  flexShrink: 0
};

export const detailsBackdrop: CSSProperties = {
  ...fillAbsolute,
  overflow: 'hidden'
};

/** Wide portal backdrop — atmospheric, center-high crop (not home-style right rail). */
export const detailsBackdropCinematic: CSSProperties = {
  ...fillAbsolute,
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'cover',
  objectPosition: 'center 36%',
  filter: 'saturate(0.92) brightness(0.82) contrast(1.04)',
  opacity: 0.88
};

/** Portrait / shared poster URL — soft ambience only; sharp art stays on poster card. */
export const detailsBackdropAmbient: CSSProperties = {
  ...fillAbsolute,
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'cover',
  objectPosition: 'center center',
  filter: 'saturate(0.88) brightness(0.62) blur(28px)',
  transform: 'scale(1.18)',
  opacity: 0.72
};

/** Bottom stage + light left pocket under poster column (no heavy right edge). */
export const detailsOverlay: CSSProperties = {
  ...fillAbsolute,
  pointerEvents: 'none',
  background:
    'linear-gradient(90deg, rgba(2, 3, 6, 0.72) 0%, rgba(2, 3, 6, 0.4) 24%, rgba(2, 3, 6, 0.06) 40%, rgba(2, 3, 6, 0) 54%), linear-gradient(180deg, rgba(2, 3, 6, 0.08) 0%, rgba(2, 3, 6, 0.42) 42%, rgba(2, 3, 6, 0.96) 68%, rgba(2, 3, 6, 1) 85%)'
};

export const detailsOverlayCorner: CSSProperties = {
  ...fillAbsolute,
  pointerEvents: 'none',
  background: 'radial-gradient(ellipse 115% 85% at 50% 45%, transparent 40%, rgba(2, 3, 6, 0.32) 100%)'
};

export function detailsBackdropVisibleStyle(visible: boolean): CSSProperties {
  return {
    transition: 'opacity 0.38s ease',
    opacity: visible ? undefined : 0
  };
}

/** Flex row instead of grid — grid/minmax/gap are unreliable on webOS */
export const detailsContent: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  maxWidth: '100%',
  overflowX: 'hidden',
  padding: '54px 52px 42px',
  boxSizing: 'border-box'
};

export const detailsPoster: CSSProperties = {
  width: '280px',
  height: '420px',
  flexShrink: 0,
  marginRight: '32px',
  borderRadius: '24px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 26px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  boxSizing: 'border-box'
};

export const detailsPosterImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block'
};

export const detailsPosterFallback: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  textAlign: 'center',
  color: '#ffffff',
  fontSize: '28px',
  lineHeight: 1.1,
  fontWeight: 900,
  letterSpacing: '-0.5px',
  wordBreak: 'break-word',
  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)'
};

export const detailsCopyBlock: CSSProperties = {
  flex: 1,
  minWidth: 0,
  paddingTop: '10px',
  maxWidth: '940px',
  boxSizing: 'border-box'
};

export const detailsEyebrow: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  marginBottom: '14px',
  color: '#ff2236',
  fontSize: '14px',
  fontWeight: 900,
  letterSpacing: '1px',
  textTransform: 'uppercase'
};

export const detailsEyebrowPart: CSSProperties = {
  marginRight: '12px'
};

export const detailsTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '64px',
  lineHeight: 0.95,
  fontWeight: 900,
  letterSpacing: '-2px',
  wordBreak: 'break-word'
};

export const detailsMeta: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: '14px',
  color: 'rgba(255, 255, 255, 0.72)',
  fontSize: '16px',
  fontWeight: 700
};

export const detailsMetaItem: CSSProperties = {
  marginRight: '12px',
  marginBottom: '4px'
};

export const detailsDescription: CSSProperties = {
  margin: '22px 0 0',
  maxWidth: '760px',
  color: 'rgba(255, 255, 255, 0.88)',
  fontSize: '18px',
  lineHeight: 1.55
};

export const detailsHint: CSSProperties = {
  margin: '16px 0 0',
  color: 'rgba(255, 255, 255, 0.55)',
  fontSize: '14px'
};

export const detailsActions: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  marginTop: '32px'
};

export const detailsButton: CSSProperties = {
  border: 0,
  borderRadius: '18px',
  padding: '18px 28px',
  minWidth: '180px',
  marginRight: '16px',
  marginBottom: '12px',
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  fontWeight: 800,
  cursor: 'pointer',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const detailsButtonLight: CSSProperties = {
  color: '#0b0d10',
  background: '#ffffff',
  boxShadow: '0 16px 32px rgba(0, 0, 0, 0.25)'
};

export const detailsButtonPrimary: CSSProperties = {
  color: '#ffffff',
  background: 'linear-gradient(180deg, #ff3047 0%, #c80d24 100%)',
  boxShadow: '0 18px 36px rgba(168, 12, 30, 0.42)'
};

export const detailsButtonIcon: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  fontSize: '20px',
  lineHeight: 1
};

export const detailsSeriesPanel: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginTop: '8px',
  maxWidth: '100%',
  boxSizing: 'border-box'
};

export const detailsSeriesBlock: CSSProperties = {
  marginBottom: '18px'
};

export const detailsButtonSecondary: CSSProperties = {
  color: '#0b0d10',
  background: 'rgba(255, 255, 255, 0.94)',
  boxShadow: '0 16px 32px rgba(0, 0, 0, 0.25)'
};

export const detailsButtonGhost: CSSProperties = {
  minWidth: '120px',
  padding: '16px 20px',
  color: 'rgba(255, 255, 255, 0.82)',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: 'none'
};

export const detailsButtonFocused: CSSProperties = {
  boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.92), 0 18px 34px rgba(0, 0, 0, 0.28)'
};

export const detailsFacts: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  marginTop: '28px'
};

export const detailsFactCard: CSSProperties = {
  flex: 1,
  padding: '18px 20px',
  borderRadius: '18px',
  background: 'rgba(255, 255, 255, 0.05)',
  boxSizing: 'border-box'
};

export const detailsFactCardFirst: CSSProperties = {
  marginRight: '18px'
};

export const detailsFactLabel: CSSProperties = {
  display: 'block',
  color: 'rgba(255, 255, 255, 0.52)',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase'
};

export const detailsFactValue: CSSProperties = {
  display: 'block',
  marginTop: '8px',
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: 1.45,
  fontWeight: 700
};

export const detailsSectionHeader: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  width: '100%'
};

export const detailsSectionTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '32px',
  lineHeight: 1.02,
  fontWeight: 900
};

export const detailsSectionCopy: CSSProperties = {
  margin: 0,
  color: 'rgba(255, 255, 255, 0.62)',
  fontSize: '14px'
};

export const detailsSeasonRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '8px 8px 12px 8px',
  margin: '-8px -8px 6px -8px',
  maxWidth: '100%',
  boxSizing: 'border-box',
  ...hideScrollbar
};

export const detailsSeasonChip: CSSProperties = {
  width: '170px',
  flexShrink: 0,
  marginRight: '14px',
  border: 0,
  borderRadius: '18px',
  padding: '16px 18px',
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'rgba(255, 255, 255, 0.88)',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  textAlign: 'left',
  fontSize: '16px',
  fontWeight: 800,
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const detailsSeasonChipActive: CSSProperties = {
  transform: 'translateY(-3px)',
  background: '#f4f4f4',
  color: '#0b0d10',
  boxShadow: '0 16px 30px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.88)'
};

export const detailsEpisodeGrid: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginLeft: '-7px',
  marginRight: '-7px'
};

export const detailsEpisodeCardWrap: CSSProperties = {
  width: '25%',
  padding: '0 7px 14px',
  boxSizing: 'border-box'
};

export const detailsEpisodeCard: CSSProperties = {
  width: '100%',
  border: 0,
  padding: 0,
  borderRadius: '20px',
  overflow: 'hidden',
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#ffffff',
  textAlign: 'left',
  outline: 'none',
  cursor: 'pointer',
  minHeight: 0,
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const detailsEpisodeCardActive: CSSProperties = {
  transform: 'translateY(-4px)',
  boxShadow: '0 18px 36px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(255, 255, 255, 0.88)'
};

export const detailsEpisodeArt: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '118px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)'
};

export const detailsEpisodeImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block'
};

export const detailsEpisodeFallback: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px',
  textAlign: 'center',
  color: '#ffffff',
  fontSize: '18px',
  lineHeight: 1.15,
  fontWeight: 900,
  letterSpacing: '-0.2px',
  wordBreak: 'break-word',
  background: 'linear-gradient(180deg, #22252d 0%, #0d0f14 100%)'
};

export const detailsEpisodeCopy: CSSProperties = {
  padding: '12px 14px 14px'
};

export const detailsEpisodeEyebrow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  color: 'rgba(255, 255, 255, 0.62)',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.8px',
  textTransform: 'uppercase'
};

export const detailsEpisodeTitle: CSSProperties = {
  display: 'block',
  marginTop: '8px',
  color: '#ffffff',
  fontSize: '15px',
  lineHeight: 1.18,
  fontWeight: 800
};

export const detailsEpisodeDescription: CSSProperties = {
  margin: '8px 0 0',
  color: 'rgba(255, 255, 255, 0.66)',
  fontSize: '12px',
  lineHeight: 1.38,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 5
};

export const detailsSimilar: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0
};

export const detailsSimilarRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '8px 8px 18px 4px',
  boxSizing: 'border-box',
  marginTop: '18px',
  maxWidth: '100%',
  ...hideScrollbar
};

export const detailsTile: CSSProperties = {
  width: '190px',
  flexShrink: 0,
  marginRight: '18px',
  border: 0,
  padding: 0,
  borderRadius: '20px',
  background: 'transparent',
  color: '#ffffff',
  textAlign: 'left',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none'
};

export const detailsTileActive: CSSProperties = {
  transform: 'translateY(-4px)',
  boxShadow: '0 18px 36px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.88)'
};

export const detailsTileArt: CSSProperties = {
  width: '190px',
  height: '285px',
  borderRadius: '20px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)'
};

export const detailsTileImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block'
};

export const detailsTileFallback: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  textAlign: 'center',
  color: '#ffffff',
  fontSize: '24px',
  lineHeight: 1.1,
  fontWeight: 900,
  letterSpacing: '-0.3px',
  wordBreak: 'break-word',
  background: 'linear-gradient(180deg, #22252d 0%, #0d0f14 100%)'
};

export const detailsTileLabel: CSSProperties = {
  display: 'block',
  marginTop: '10px',
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '14px',
  lineHeight: 1.35
};

export const detailsEmpty: CSSProperties = {
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  gap: '18px',
  textAlign: 'center'
};

export const detailsEmptyTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '42px'
};

export const panelScreenBase: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '360px minmax(0, 1fr)',
  gap: '28px',
  minHeight: '100%',
  overflowY: 'auto',
  padding: '30px 28px 24px 24px',
  background:
    'linear-gradient(90deg, rgba(3, 4, 7, 0.98) 0%, rgba(3, 4, 7, 0.98) 100%), radial-gradient(circle at 45% 10%, rgba(229, 9, 20, 0.08), transparent 26%)',
  boxSizing: 'border-box'
};

export const panelSidebar: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
  minWidth: 0,
  paddingTop: '8px',
  paddingLeft: '8px',
  paddingRight: '8px',
  overflowY: 'auto',
  boxSizing: 'border-box'
};

export const panelHeader: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

export const panelTitle: CSSProperties = {
  margin: 0,
  color: '#ffffff',
  fontSize: '34px',
  lineHeight: 1.04,
  fontWeight: 800,
  letterSpacing: '-0.8px'
};

export const panelCopy: CSSProperties = {
  margin: 0,
  maxWidth: '300px',
  color: 'rgba(255, 255, 255, 0.62)',
  fontSize: '15px',
  lineHeight: 1.5
};

export const panelMeta: CSSProperties = {
  margin: 0,
  color: '#ff2438',
  fontSize: '14px',
  fontWeight: 800,
  letterSpacing: '1px',
  textTransform: 'uppercase'
};

export const panelAction: CSSProperties = {
  border: 0,
  borderRadius: '18px',
  minHeight: '58px',
  padding: '0 18px',
  background: '#1c2028',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 700,
  textAlign: 'left',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
  cursor: 'pointer',
  boxSizing: 'border-box'
};

export const panelActionGhost: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)'
};

export const panelActionActive: CSSProperties = {
  transform: 'translateY(-2px)',
  boxShadow: '0 18px 34px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.9)'
};

export const panelActions: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '14px',
  marginTop: '10px'
};

export const panelCardGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '16px'
};

export const panelInfoCard: CSSProperties = {
  padding: '18px 20px',
  borderRadius: '18px',
  background: 'rgba(255, 255, 255, 0.05)'
};

export const panelInfoLabel: CSSProperties = {
  display: 'block',
  color: 'rgba(255, 255, 255, 0.52)',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase'
};

export const panelInfoValue: CSSProperties = {
  display: 'block',
  marginTop: '8px',
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: 1.45,
  fontWeight: 700
};

export const watchlistList: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  paddingRight: '6px',
  overflowY: 'auto'
};

export const watchlistCard: CSSProperties = {
  border: 0,
  padding: '12px',
  borderRadius: '22px',
  background: 'rgba(18, 20, 26, 0.8)',
  color: '#ffffff',
  textAlign: 'left',
  display: 'grid',
  gridTemplateColumns: '72px minmax(0, 1fr)',
  gap: '14px',
  alignItems: 'center',
  cursor: 'pointer',
  boxSizing: 'border-box'
};

export const watchlistCardActive: CSSProperties = {
  transform: 'translateY(-3px)',
  boxShadow: '0 18px 36px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.88)',
  background: 'rgba(36, 39, 48, 0.95)'
};

export const watchlistCardArt: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '16px',
  aspectRatio: '2 / 3',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)'
};

export const watchlistCardImg: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block'
};

export const watchlistCardFallback: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 900,
  background: 'linear-gradient(180deg, #22252d 0%, #0d0f14 100%)'
};

export const watchlistCardCopy: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

export const watchlistCardTitle: CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: 1.25,
  fontWeight: 800
};

export const watchlistCardMeta: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.62)',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase'
};

export const watchlistPreview: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
  paddingTop: '10px',
  overflowY: 'auto',
  boxSizing: 'border-box'
};

export const watchlistHero: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '240px minmax(0, 1fr)',
  gap: '28px',
  alignItems: 'start'
};

export const watchlistPoster: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '16px',
  width: '240px',
  aspectRatio: '2 / 3',
  background: 'linear-gradient(180deg, rgba(18, 20, 24, 0.96) 0%, rgba(8, 9, 12, 0.96) 100%)'
};

export const watchlistDetails: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  paddingTop: '10px'
};

export const watchlistChips: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px'
};

export const watchlistEmpty: CSSProperties = {
  minHeight: '320px',
  borderRadius: '26px',
  padding: '34px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '18px',
  background: 'rgba(12, 15, 20, 0.72)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
  boxSizing: 'border-box'
};

export const settingsMenuList: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  paddingLeft: '6px',
  paddingRight: '6px'
};

export const settingsMenuItem: CSSProperties = {
  border: 0,
  borderRadius: '20px',
  padding: '16px 18px',
  background: 'rgba(18, 20, 26, 0.8)',
  color: 'rgba(255, 255, 255, 0.72)',
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  cursor: 'pointer',
  boxSizing: 'border-box'
};

export const settingsMenuItemActive: CSSProperties = {
  transform: 'translateY(-3px)',
  background: '#f4f4f4',
  color: '#0b0d10',
  boxShadow: '0 18px 36px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.88)'
};

export const settingsMenuItemTitle: CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 800
};

export const settingsMenuItemTitleActive: CSSProperties = {
  color: '#0b0d10'
};

export const settingsMenuItemCopy: CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.6px'
};

export const settingsPanel: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
  paddingTop: '10px',
  paddingLeft: '16px',
  paddingRight: '16px',
  overflowY: 'auto',
  boxSizing: 'border-box'
};

export const settingsSection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '18px'
};

export const settingsProfileGrid: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

export const settingsProfileCard: CSSProperties = {
  border: 0,
  borderRadius: '22px',
  padding: '16px',
  background: 'rgba(18, 20, 26, 0.8)',
  color: '#ffffff',
  textAlign: 'left',
  display: 'grid',
  gridTemplateColumns: '58px minmax(0, 1fr)',
  gap: '14px',
  alignItems: 'center',
  cursor: 'pointer',
  boxSizing: 'border-box'
};

export const settingsProfileCardActive: CSSProperties = {
  transform: 'translateY(-2px)',
  background: 'rgba(36, 39, 48, 0.95)',
  boxShadow: '0 18px 34px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.9)'
};

export const settingsProfileAvatar: CSSProperties = {
  width: '58px',
  height: '58px',
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(180deg, #ff2438 0%, #9e1421 100%)',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 900
};

export const settingsProfileAvatarKids: CSSProperties = {
  background: 'linear-gradient(180deg, #54c36f 0%, #1f7a34 100%)'
};

export const settingsProfileName: CSSProperties = {
  color: '#ffffff',
  fontSize: '17px',
  lineHeight: 1.2,
  fontWeight: 800
};

export const settingsToggle: CSSProperties = {
  border: 0,
  borderRadius: '22px',
  padding: '18px 20px',
  background: 'rgba(18, 20, 26, 0.8)',
  color: '#ffffff',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  cursor: 'pointer',
  boxSizing: 'border-box'
};

export const settingsToggleActive: CSSProperties = {
  transform: 'translateY(-2px)',
  background: 'rgba(36, 39, 48, 0.95)',
  boxShadow: '0 18px 34px rgba(0, 0, 0, 0.28), 0 0 0 3px rgba(255, 255, 255, 0.9)'
};

export const settingsToggleTitle: CSSProperties = {
  display: 'block',
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 800
};

export const settingsToggleValue: CSSProperties = {
  fontStyle: 'normal',
  color: '#ff2438',
  fontSize: '14px',
  fontWeight: 800,
  letterSpacing: '0.8px',
  textTransform: 'uppercase'
};

export const settingsToggleHint: CSSProperties = {
  display: 'block',
  color: 'rgba(255, 255, 255, 0.52)',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  marginTop: '4px'
};

export const playerScreen: CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top left, rgba(245, 208, 106, 0.14), transparent 32%), radial-gradient(circle at center, rgba(0, 0, 0, 0.1), transparent 44%), linear-gradient(180deg, #090c14 0%, #03050a 100%)',
  color: '#f4f7fb'
};

export const playerVideo: CSSProperties = {
  ...fillAbsolute,
  width: '100%',
  height: '100%',
  display: 'block',
  background: '#000'
};

export const playerVideoContain: CSSProperties = { objectFit: 'contain' };
export const playerVideoCover: CSSProperties = { objectFit: 'cover' };
export const playerVideoFill: CSSProperties = { objectFit: 'fill' };

export const playerRecoverySrOnly: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0
};

export const playerSettingsBack: CSSProperties = {
  border: 0,
  borderRadius: '18px',
  padding: '18px 20px',
  color: '#f4f7fb',
  background: 'rgba(255, 255, 255, 0.08)',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'block',
  width: '180px',
  marginBottom: '14px',
  boxSizing: 'border-box'
};

export const playerHud: CSSProperties = {
  ...fillAbsolute,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '26px 32px 28px',
  opacity: 0,
  transform: 'translateY(12px)',
  transition: 'opacity 180ms ease, transform 180ms ease',
  pointerEvents: 'none',
  boxSizing: 'border-box'
};

export const playerHudVisible: CSSProperties = {
  opacity: 1,
  transform: 'translateY(0)',
  pointerEvents: 'auto'
};

export const playerHudTopbar: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  width: '100%',
  boxSizing: 'border-box'
};

export const playerHudBadge: CSSProperties = {
  width: '680px',
  maxWidth: '680px',
  display: 'flex',
  flexDirection: 'column',
  padding: '12px 14px',
  borderRadius: '18px',
  background: 'rgba(6, 8, 12, 0.34)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
  boxSizing: 'border-box'
};

export const playerEyebrow: CSSProperties = {
  margin: 0,
  color: '#f5d06a',
  textTransform: 'uppercase',
  letterSpacing: '0.26em',
  fontSize: '11px',
  fontWeight: 800
};

export const playerTitle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: '28px',
  lineHeight: 1.05,
  letterSpacing: '-0.03em'
};

export const playerSubtitle: CSSProperties = {
  marginTop: '4px',
  fontSize: '15px',
  color: 'rgba(244, 247, 251, 0.76)'
};

export const playerHudMeta: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  marginLeft: '24px',
  color: 'rgba(244, 247, 251, 0.72)',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  padding: '10px 0 0'
};

export const playerHudDock: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '18px 20px',
  borderRadius: '24px',
  background: 'linear-gradient(180deg, rgba(6, 8, 12, 0.24), rgba(6, 8, 12, 0.56))',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 22px 42px rgba(0, 0, 0, 0.28)',
  boxSizing: 'border-box'
};

export const playerProgressWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '14px'
};

export const playerTime: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '10px',
  fontSize: '16px',
  color: 'rgba(244, 247, 251, 0.82)'
};

export const playerProgress: CSSProperties = {
  position: 'relative',
  height: '10px',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(255, 255, 255, 0.16)'
};

export const playerProgressBuffered: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  background: 'rgba(255, 255, 255, 0.28)',
  height: '100%'
};

export const playerProgressPlayed: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  background: 'linear-gradient(90deg, #f5d06a 0%, #ff7a59 100%)',
  height: '100%'
};

export const playerControls: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  boxSizing: 'border-box'
};

export const playerButton: CSSProperties = {
  border: 0,
  borderRadius: '999px',
  width: '58px',
  height: '58px',
  margin: '0 7px',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 700,
  color: '#f4f7fb',
  background: 'rgba(255, 255, 255, 0.08)',
  cursor: 'pointer',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
  boxSizing: 'border-box'
};

export const playerButtonPrimary: CSSProperties = {
  width: '72px',
  height: '72px',
  minWidth: '72px',
  background: 'linear-gradient(135deg, #f5d06a 0%, #ff7a59 100%)',
  color: '#15171f'
};

export const playerButtonActive: CSSProperties = {
  outline: 'none',
  transform: 'scale(1.03)',
  boxShadow: '0 0 0 3px rgba(245, 208, 106, 0.42), 0 22px 36px rgba(0, 0, 0, 0.36)'
};

export const playerRecovery: CSSProperties = {
  ...fillAbsolute,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3,
  pointerEvents: 'none'
};

export const playerSeekToastLeft: CSSProperties = {
  ...fillAbsolute,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingLeft: '6%',
  paddingTop: '0',
  paddingRight: '0',
  paddingBottom: '0',
  zIndex: 4,
  pointerEvents: 'none'
};

export const playerSeekToastRight: CSSProperties = {
  ...fillAbsolute,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: '6%',
  paddingTop: '0',
  paddingLeft: '0',
  paddingBottom: '0',
  zIndex: 4,
  pointerEvents: 'none'
};

export const playerSeekToastCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  pointerEvents: 'none'
};

export const playerSeekToastAmount: CSSProperties = {
  fontSize: '44px',
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: '0.02em',
  color: '#ffffff',
  textShadow: '0 4px 16px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(255, 255, 255, 0.3)'
};

export const playerSeekToastLabel: CSSProperties = {
  display: 'none'
};

export const playerRecoveryCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '16px 18px',
  borderRadius: '20px',
  background: 'rgba(6, 8, 12, 0.76)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 20px 40px rgba(0, 0, 0, 0.34)'
};

export const playerRecoveryCardCompact: CSSProperties = {
  width: '64px',
  height: '64px',
  justifyContent: 'center',
  padding: 0,
  borderRadius: '999px'
};

export const playerRecoverySpinner: CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '999px',
  border: '5px solid rgba(255, 255, 255, 0.15)',
  borderTopColor: '#e50914',
  animation: 'spin 1s linear infinite'
};

export const playerScreenEmpty: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '40px'
};

export const playerSettings: CSSProperties = {
  ...fillAbsolute,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: '40px',
  background: 'rgba(3, 5, 10, 0.42)'
};

export const playerSettingsPanel: CSSProperties = {
  width: '760px',
  maxWidth: '760px',
  borderRadius: '28px',
  padding: '24px',
  background: 'rgba(13, 18, 30, 0.96)',
  boxShadow: '0 28px 60px rgba(0, 0, 0, 0.5)',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box'
};

export const playerSettingsItem: CSSProperties = {
  border: 0,
  borderRadius: '18px',
  padding: '18px 20px',
  color: '#f4f7fb',
  background: 'rgba(255, 255, 255, 0.08)',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'block',
  width: '100%',
  marginBottom: '12px',
  boxSizing: 'border-box'
};

export const playerSettingsItemRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%'
};

export const playerSettingsItemClose: CSSProperties = {
  background: 'linear-gradient(135deg, #f5d06a 0%, #ff7a59 100%)',
  color: '#15171f'
};

export const playerSettingsItemActive: CSSProperties = {
  outline: 'none',
  boxShadow: '0 0 0 3px rgba(245, 208, 106, 0.4)'
};

export const playerSettingsChoice: CSSProperties = {
  width: '140px',
  marginRight: '12px'
};

export const playerSettingsList: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  marginTop: '2px'
};

export const bootScreen: CSSProperties = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '18px',
  background:
    'radial-gradient(circle at 50% 44%, rgba(229, 9, 20, 0.16), transparent 28%), linear-gradient(145deg, #040507 0%, #0b0f15 52%, #020304 100%)',
  boxSizing: 'border-box'
};
