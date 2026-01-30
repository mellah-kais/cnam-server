
import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3001;

// Initialize Socket Service
import { SocketService } from './services/socket.service';
new SocketService(io);

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
