'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import {
    LayoutDashboard,
    Globe,
    Ticket,
    Package,
    Bell,
    Megaphone,
    Settings,
    LogOut,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/portals', label: 'Portals', icon: Globe },
    { href: '/tickets', label: 'Tickets', icon: Ticket },
    { href: '/packages', label: 'Packages', icon: Package },
    { href: '/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/notifications', label: 'Notifications', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { admin, refreshToken, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            // Call API to invalidate refresh token on server
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch {
            // Ignore errors, logout anyway
        }
        logout();
    };

    return (
        <aside className="w-64 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0">
            {/* Logo */}
            <div className="p-6 border-b border-[var(--border)]">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Smartifly Admin
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-white'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {admin?.email?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{admin?.name || 'Admin'}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{admin?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
