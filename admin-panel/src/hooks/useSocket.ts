import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './useDashboard';
import { DashboardStats } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Singleton socket instance to prevent duplicate connections in development (React StrictMode)
let globalSocket: Socket | null = null;
let connectionCount = 0;

export function useSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const queryClient = useQueryClient();
    // Use ref to avoid queryClient in dependency array causing reconnections
    const queryClientRef = useRef(queryClient);
    queryClientRef.current = queryClient;

    useEffect(() => {
        // Increment connection count
        connectionCount++;

        // Reuse existing socket or create new one
        if (!globalSocket || !globalSocket.connected) {
            globalSocket = io(SOCKET_URL, {
                withCredentials: true,
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
        }

        const socket = globalSocket;
        socketRef.current = socket;

        // Define event handlers
        const handleConnect = () => {

            setIsConnected(true);
        };

        const handleDisconnect = (reason: string) => {

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
            console.error('🔌 Socket error:', error);
        };

        // Attach event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('dashboard-stats', handleDashboardStats);
        socket.on('invalidate', handleInvalidate);
        socket.on('connect_error', handleError);

        // Update connected state if already connected
        if (socket.connected) {
            setIsConnected(true);
        }

        // Cleanup function
        return () => {
            // Decrement connection count
            connectionCount--;

            // Remove event listeners explicitly
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('dashboard-stats', handleDashboardStats);
            socket.off('invalidate', handleInvalidate);
            socket.off('connect_error', handleError);

            // Only disconnect if this is the last component using the socket
            if (connectionCount === 0 && socket.connected) {

                socket.disconnect();
                globalSocket = null;
            }
        };
    }, []); // Empty dependency array - stable connection

    return {
        socket: socketRef.current,
        isConnected,
    };
}

