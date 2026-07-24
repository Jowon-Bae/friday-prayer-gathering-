import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Set up storage for uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.use('/uploads', express.static(uploadsDir));

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
});

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Per-room state
const defaultState = () => ({
    is_playing: false,
    current_bpm: 70,
    current_cue: '',
    current_key: '',
    current_modifiers: [],
    current_color: '#000000',
    current_song: '',
    next_song: '',
    current_inear_targets: [],
    current_inear_vol: 0
});

const roomStates = {};
const roomChats = {};
const MAX_CHAT_HISTORY = 50;
const roomPasswords = {}; // roomCode -> password (empty string = no password)

function getRoomState(room) {
    if (!roomStates[room]) roomStates[room] = defaultState();
    return roomStates[room];
}

function getRoomChats(room) {
    if (!roomChats[room]) roomChats[room] = [];
    return roomChats[room];
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let currentRoom = 'DEFAULT';

    // Send default state immediately on connection (will be overridden by join_room)
    socket.join('DEFAULT');
    socket.emit('state_update', getRoomState('DEFAULT'));
    socket.emit('chat_history', getRoomChats('DEFAULT'));

    // Client joins a room
    socket.on('join_room', (roomCode) => {
        const room = (roomCode || 'DEFAULT').toUpperCase().trim();

        // Leave previous room if any
        if (currentRoom) {
            socket.leave(currentRoom);
        }

        currentRoom = room;
        socket.join(room);
        console.log(`${socket.id} joined room: ${room}`);

        // Send current room state and chat history to this client
        socket.emit('state_update', getRoomState(room));
        socket.emit('chat_history', getRoomChats(room));
    });

    // Verify password before joining
    socket.on('verify_room', ({ roomCode, password }) => {
        const room = (roomCode || 'DEFAULT').toUpperCase().trim();
        const stored = roomPasswords[room] || '';
        const ok = stored === '' || stored === (password || '');
        socket.emit('verify_room_result', { ok, room });
    });

    // Master sets room password
    socket.on('set_room_password', ({ roomCode, password }) => {
        const room = (roomCode || 'DEFAULT').toUpperCase().trim();
        roomPasswords[room] = password || '';
        console.log(`Room ${room} password updated`);
        socket.emit('set_room_password_result', { ok: true });
    });

    // Listen for state changes from Master
    socket.on('update_state', (newState) => {
        if (!currentRoom) return;
        roomStates[currentRoom] = { ...getRoomState(currentRoom), ...newState };
        io.to(currentRoom).emit('state_update', roomStates[currentRoom]);
    });

    // Listen for new chat messages
    socket.on('send_chat', (data) => {
        if (!currentRoom) return;
        const chats = getRoomChats(currentRoom);
        const message = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            role: data.role || 'User',
            senderName: data.senderName || '익명',
            text: data.text || '',
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileType: data.fileType || null,
            timestamp: new Date().toISOString()
        };

        chats.push(message);
        if (chats.length > MAX_CHAT_HISTORY) {
            chats.shift();
        }

        io.to(currentRoom).emit('chat_message', message);
    });

    // Listen for delete requests
    socket.on('delete_chat', (msgId) => {
        if (!currentRoom) return;
        const chats = getRoomChats(currentRoom);
        const msgIndex = chats.findIndex(m => m.id === msgId);
        if (msgIndex !== -1) {
            const msg = chats[msgIndex];
            if (msg.fileUrl) {
                const filename = msg.fileUrl.split('/').pop();
                const filepath = path.join(uploadsDir, filename);
                if (fs.existsSync(filepath)) {
                    try {
                        fs.unlinkSync(filepath);
                    } catch (err) {
                        console.error('Error deleting file:', err);
                    }
                }
            }
            chats.splice(msgIndex, 1);
            io.to(currentRoom).emit('chat_deleted', msgId);
        }
    });


    // Typing indicator events
    socket.on('typing_start', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('user_typing', { name: data.name, role: data.role });
    });

    socket.on('typing_stop', (data) => {
        if (!currentRoom) return;
        socket.to(currentRoom).emit('user_stopped_typing', { name: data.name, role: data.role });
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
