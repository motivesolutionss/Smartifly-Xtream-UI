import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';

let io: Server;

export const initializeSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    // Simulate real-time dashboard updates
    setInterval(() => {
        const mockStats = {
            portals: 5,
            tickets: Math.floor(Math.random() * 50) + 10,
            openTickets: Math.floor(Math.random() * 20),
            packages: 12,
            devices: Math.floor(Math.random() * 2000) + 1000,
        };

        io.emit('dashboard-stats', mockStats);
    }, 5000); // Emit every 5 seconds

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const notifyInvalidation = (keys: string[]) => {
    try {
        const io = getIO();
        io.emit('invalidate', { keys });
    } catch (error) {
        console.error('Failed to emit invalidation event:', error);
    }
};
