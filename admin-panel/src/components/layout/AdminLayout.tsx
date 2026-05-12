'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

import { useSocket } from '@/hooks/useSocket';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { isAuthenticated, admin, setAdmin, logout } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    // Initialize global socket listener
    useSocket();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isAuthenticated) {
            router.push('/login');
        }
    }, [mounted, isAuthenticated, router]);

    useEffect(() => {
        if (!mounted || !isAuthenticated || admin) return;

        let cancelled = false;
        (async () => {
            try {
                const response = await authApi.me();
                const user = response.data?.user;
                if (!cancelled && user) {
                    setAdmin({
                        id: user.id,
                        name: user.name ?? null,
                        email: user.email,
                    });
                }
            } catch {
                if (!cancelled) {
                    logout();
                    router.push('/login');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [mounted, isAuthenticated, admin, setAdmin, logout, router]);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                    },
                }}
            />
            <Sidebar />
            <main className="ml-64 p-8">
                <div className="animate-fadeIn">{children}</div>
            </main>
        </div>
    );
}
