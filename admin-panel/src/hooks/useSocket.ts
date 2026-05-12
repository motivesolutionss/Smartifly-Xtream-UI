import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './useDashboard';
import { DashboardStats } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Singleton socket instance to prevent duplicate connections in development (React StrictMode)
let globalSocket: Socket | null = null;
let globalSocketToken: string | null = null;
let connectionCount = 0;

export function useSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const queryClient = useQueryClient();
    const queryClientRef = useRef(queryClient);
    queryClientRef.current = queryClient;

    useEffect(() => {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
        if (!token) {
            setIsConnected(false);
            return;
        }

        connectionCount++;

        // Recreate socket when auth token changed.
        if (globalSocket && globalSocketToken !== token) {
            globalSocket.disconnect();
            globalSocket = null;
            globalSocketToken = null;
        }

        if (!globalSocket) {
            globalSocket = io(SOCKET_URL, {
                withCredentials: true,
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
            globalSocketToken = token;
        }

        const socket = globalSocket;
        socketRef.current = socket;

        const handleConnect = () => {
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        const handleDashboardStats = (data: DashboardStats) => {
            queryClientRef.current.setQueryData(dashboardKeys.stats(), data);
        };

        const handleInvalidate = (data: { keys: string[] }) => {
            if (data.keys && Array.isArray(data.keys)) {
                queryClientRef.current.invalidateQueries({ queryKey: data.keys });
            }
        };

        const handleError = (error: Error) => {
            if (error.message !== 'Unauthorized') {
                console.error('Socket error:', error.message);
            }
            setIsConnected(false);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('dashboard-stats', handleDashboardStats);
        socket.on('invalidate', handleInvalidate);
        socket.on('connect_error', handleError);

        if (socket.connected) {
            setIsConnected(true);
        }

        return () => {
            connectionCount--;

            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('dashboard-stats', handleDashboardStats);
            socket.off('invalidate', handleInvalidate);
            socket.off('connect_error', handleError);

            if (connectionCount === 0) {
                socket.disconnect();
                globalSocket = null;
                globalSocketToken = null;
            }
        };
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
    };
}
