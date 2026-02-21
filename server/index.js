import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Global state
let appState = {
    current_bpm: 70, // changed default to 70
    current_cue: '', // This will hold 'Sections' (V1, CH, BR)
    current_key: '', // This will hold 'Keys' (KA, KBb, KC)
    current_modifiers: [], // This will hold 'Modifiers' (ONEMORE, KEYUP)
    current_color: '#000000',
    current_song: ''
};

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state to the newly connected client
    socket.emit('state_update', appState);

    // Listen for state changes from Master
    socket.on('update_state', (newState) => {
        appState = { ...appState, ...newState };

        // Broadcast updated state to all clients
        io.emit('state_update', appState);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO Server running on port ${PORT}`);
});
