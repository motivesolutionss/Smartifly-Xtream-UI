export const uiTokens = {
    white: '#FFFFFF',
    black: '#000000',
    neutral500: '#888888',
    overlayWhite10: 'rgba(255, 255, 255, 0.1)',
    overlayWhite20: 'rgba(255, 255, 255, 0.2)',
    overlayWhite30: 'rgba(255, 255, 255, 0.3)',
    overlayWhite40: 'rgba(255, 255, 255, 0.4)',
    overlayWhite50: 'rgba(255, 255, 255, 0.5)',
    overlayWhite70: 'rgba(255, 255, 255, 0.7)',
    overlayWhite80: 'rgba(255, 255, 255, 0.8)',
    overlayWhite90: 'rgba(255, 255, 255, 0.9)',
} as const;

export type UiTokens = typeof uiTokens;
