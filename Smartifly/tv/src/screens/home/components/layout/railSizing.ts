import { scale } from '../../../../theme';

export const HOME_SIDEBAR_GAP = scale(152);

export type RailLayoutPreset = 'fiveUpContinue' | 'fiveUpLive' | 'sixUpPoster';

const railGroupAFiveUp = {
  cardMargin: scale(16),
  focusBleed: scale(8),
  targetVisibleCards: 5,
  listLeftPadding: scale(30),
  listRightPadding: scale(10),
  listLeftFocusMargin: scale(4),
  minCardWidth: scale(220),
} as const;

export const railGroupContinue = {
  ...railGroupAFiveUp,
  cardHeight: scale(190),
} as const;

export const railGroupLive = {
  ...railGroupAFiveUp,
  cardHeight: scale(236),
} as const;

// Group B: Movies + Series (must stay identical)
export const railGroupB = {
  cardHeight: scale(378),
  cardMargin: scale(18),
  targetVisibleCards: 6,
  listViewportOffset: scale(24),
  listInnerLeftPad: scale(6),
  listRightPad: scale(12),
  minCardWidth: scale(180),
} as const;

export const computeGroupACardWidth = (railWidth: number): number => {
  const usableWidth = Math.max(0, railWidth - railGroupAFiveUp.listLeftPadding - railGroupAFiveUp.listRightPadding);
  const raw = (usableWidth - railGroupAFiveUp.cardMargin * (railGroupAFiveUp.targetVisibleCards - 1)) / railGroupAFiveUp.targetVisibleCards;
  return Math.max(railGroupAFiveUp.minCardWidth, Math.floor(raw));
};

export const computeGroupBCardWidth = (railWidth: number): number => {
  const usableWidth = Math.max(
    0,
    railWidth - railGroupB.listViewportOffset - railGroupB.listInnerLeftPad - railGroupB.listRightPad
  );
  const raw = (usableWidth - railGroupB.cardMargin * (railGroupB.targetVisibleCards - 1)) / railGroupB.targetVisibleCards;
  return Math.max(railGroupB.minCardWidth, Math.floor(raw));
};

export const getRailLayoutMetrics = (
  preset: RailLayoutPreset,
  railWidth: number
) => {
  if (preset === 'fiveUpContinue' || preset === 'fiveUpLive') {
    const group = preset === 'fiveUpLive' ? railGroupLive : railGroupContinue;
    return {
      cardWidth: computeGroupACardWidth(railWidth),
      cardHeight: group.cardHeight,
      cardGap: group.cardMargin,
      listLeft: group.listLeftPadding,
      contentLeft: 0,
      contentRight: group.listRightPadding,
    };
  }

  return {
    cardWidth: computeGroupBCardWidth(railWidth),
    cardHeight: railGroupB.cardHeight,
    cardGap: railGroupB.cardMargin,
    listLeft: railGroupB.listViewportOffset + railGroupB.listInnerLeftPad,
    contentLeft: 0,
    contentRight: railGroupB.listRightPad,
  };
};
