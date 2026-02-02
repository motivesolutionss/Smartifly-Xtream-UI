import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export interface IntroState {
    currentStep: number;
    completed: boolean;
    loading: boolean;
    skipAll: boolean;
    loadIntroState: () => Promise<void>;
    advanceStep: () => Promise<void>;
    completeIntro: () => Promise<void>;
}

const STORAGE_KEY = 'smartifly_intro_state';
const TOTAL_STEPS = 3;

const parse = (value: string | null) => {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const serialize = (payload: { currentStep: number; completed: boolean; skipAll: boolean }) => {
    return JSON.stringify(payload);
};

export const useIntroStore = create<IntroState>((set, get) => ({
    currentStep: 0,
    completed: false,
    loading: true,
    skipAll: false,
    loadIntroState: async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const stored = parse(raw);
            if (stored) {
                set({
                    currentStep: stored.currentStep,
                    completed: stored.completed,
                    skipAll: stored.skipAll,
                    loading: false,
                });
                return;
            }
        } catch (error) {
            console.warn('[IntroStore] Failed to load state', error);
        }

        set({ loading: false });
    },
    advanceStep: async () => {
        const { currentStep } = get();
        const nextStep = Math.min(TOTAL_STEPS - 1, currentStep + 1);
        const completed = nextStep >= TOTAL_STEPS - 1;
        const payload = { currentStep: nextStep, completed, skipAll: false };
        set(payload);
        await AsyncStorage.setItem(STORAGE_KEY, serialize(payload));
    },
    completeIntro: async () => {
        const payload = { currentStep: TOTAL_STEPS - 1, completed: true, skipAll: true };
        set(payload);
        await AsyncStorage.setItem(STORAGE_KEY, serialize(payload));
    },
}));

export const resetIntroState = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
};
