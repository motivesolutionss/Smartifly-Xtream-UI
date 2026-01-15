'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(''); // Clear previous errors

        try {
            const response = await authApi.login(email, password);
            const { token, refreshToken, admin } = response.data;
            login(token, refreshToken, admin);
            toast.success('Welcome back!');
            router.push('/dashboard');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            const errorMessage = err.response?.data?.error || 'Login failed';
            setError(errorMessage); // Set error state for display
            toast.error(errorMessage); // Show toast notification
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)] relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs - More Visible */}
                <div className="absolute top-[-15%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-transparent rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-15%] right-[-5%] w-[700px] h-[700px] bg-gradient-to-tl from-purple-500/35 via-pink-500/25 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-[30%] right-[15%] w-[400px] h-[400px] bg-gradient-to-br from-cyan-500/25 via-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-gradient-to-tr from-fuchsia-500/20 via-violet-500/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

                {/* Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.6) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }}
                />

                {/* Radial Gradient Overlay - Lighter for more glow visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-primary)]/30 to-[var(--bg-primary)]/80" />
            </div>

            <Toaster position="top-center" />
            <Toaster position="top-center" />
            <div className="w-full max-w-[500px] relative z-10 animate-fadeIn">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl overflow-hidden mb-6 shadow-xl shadow-indigo-500/30 ring-2 ring-indigo-500/20 bg-black/20 backdrop-blur-sm">
                        <Image
                            src="/smartifly-logo.webp"
                            alt="Smartifly Logo"
                            width={128}
                            height={128}
                            className="object-contain p-2"
                            priority
                        />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
                        Smartifly
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-4 text-lg tracking-wide font-medium">Admin Control Center</p>
                </div>

                {/* Login Card */}
                <div className="glass-card p-12 shadow-2xl shadow-black/40 border-[var(--border)] relative overflow-hidden backdrop-blur-xl">
                    {/* Card Glow Effect */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                    <h2 className="text-xl font-semibold mb-6 text-center">Welcome Back</h2>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="text-red-500 mt-0.5" size={18} />
                            <p className="text-red-500 text-sm flex-1">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                className="input"
                                placeholder="admin@smartifly.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input pr-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[var(--text-muted)] text-sm mt-6">
                    Smartifly OTT Platform
                </p>
            </div>
        </div>
    );
}
