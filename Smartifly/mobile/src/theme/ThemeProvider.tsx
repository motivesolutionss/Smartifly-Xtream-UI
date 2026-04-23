import React, { createContext, useCallback, useMemo, useState, useContext } from 'react';
import { Platform } from 'react-native';
import {
    colors,
    gradients,
    ThemeId,
    setActiveTheme,
    defaultThemeId as colorsDefaultThemeId,
    type Colors,
    type Gradients,
    activeTheme
} from './colors';
import { getTheme } from './platformTheme';
import type { Theme } from './themes/types';

export interface ThemeContextValue {
    themeId: ThemeId;
    colors: Colors;
    gradients: Gradients;
    theme: ReturnType<typeof getTheme>;
    effects: Theme['effects'];
    isTV: boolean;
    setActiveTheme: (themeId: ThemeId) => Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultThemeId?: ThemeId;
    forceTV?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultThemeId: initialThemeId = colorsDefaultThemeId,
    forceTV,
}) => {
    const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
    const isTV = forceTV ?? Platform.isTV;

    const switchTheme = useCallback(
        (nextThemeId: ThemeId) => {
            const nextTheme = setActiveTheme(nextThemeId);
            setThemeId(nextThemeId);
            return nextTheme;
        },
        [setThemeId]
    );

    const value = useMemo(
        () => ({
            themeId,
            colors,
            gradients,
            theme: getTheme(isTV),
            effects: activeTheme.effects,
            isTV,
            setActiveTheme: switchTheme,
        }),
        [themeId, isTV, switchTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be rendered within ThemeProvider');
    }
    return context;
};

export const useThemeId = () => {
    const context = useTheme();
    return context.themeId;
};
