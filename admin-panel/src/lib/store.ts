import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface Admin {
    id: string | number;
    email: string;
    name: string | null;
}

interface AuthState {
    token: string | null;
    refreshToken: string | null;
    admin: Admin | null;
    isAuthenticated: boolean;
    login: (token: string, refreshToken: string, admin: Admin) => void;
    updateTokens: (token: string, refreshToken: string) => void;
    setAdmin: (admin: Admin | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            refreshToken: null,
            admin: null,
            isAuthenticated: false,
            login: (token, refreshToken, admin) => {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('token', token);
                    sessionStorage.setItem('refreshToken', refreshToken);
                }
                set({ token, refreshToken, admin, isAuthenticated: true });
            },
            updateTokens: (token, refreshToken) => {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('token', token);
                    sessionStorage.setItem('refreshToken', refreshToken);
                }
                set({ token, refreshToken });
            },
            setAdmin: (admin) => {
                const hasToken = typeof window !== 'undefined' ? !!sessionStorage.getItem('token') : false;
                set({ admin, isAuthenticated: !!admin || hasToken });
            },
            logout: () => {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('refreshToken');
                }
                set({ token: null, refreshToken: null, admin: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => {
                if (typeof window !== 'undefined') {
                    return sessionStorage;
                }
                const noopStorage: StateStorage = {
                    getItem: () => null,
                    setItem: () => { },
                    removeItem: () => { },
                };
                return noopStorage;
            }),
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                admin: state.admin,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
