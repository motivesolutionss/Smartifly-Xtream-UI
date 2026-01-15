import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
    id: string;
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
                    localStorage.setItem('token', token);
                    localStorage.setItem('refreshToken', refreshToken);
                }
                set({ token, refreshToken, admin, isAuthenticated: true });
            },
            updateTokens: (token, refreshToken) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token);
                    localStorage.setItem('refreshToken', refreshToken);
                }
                set({ token, refreshToken });
            },
            logout: () => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
                set({ token: null, refreshToken: null, admin: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                refreshToken: state.refreshToken,
                admin: state.admin,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
