
import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();

import { SocketService } from './services/socket.service';

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 30000,
    pingInterval: 10000,
    transports: ['websocket', 'polling']
});

// Initialize Socket Service
new SocketService(io);

const port = process.env.PORT || 3001;

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
