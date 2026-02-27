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
        // Create unique filenames avoiding collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Extract original extension safely
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve the uploads directory statically so clients can download files
app.use('/uploads', express.static(uploadsDir));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    // Return relative URL for the client to use
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

// Global state
let appState = {
    is_playing: false,
    current_bpm: 70, // changed default to 70
    current_cue: '', // This will hold 'Sections' (V1, CH, BR)
    current_key: '', // This will hold 'Keys' (KA, KBb, KC)
    current_modifiers: [], // This will hold 'Modifiers' (ONEMORE, KEYUP)
    current_color: '#000000',
    current_song: '',
    current_inear_targets: [],
    current_inear_vol: 0
};

let chatHistory = [];
const MAX_CHAT_HISTORY = 50;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send current state and chat history to the newly connected client
    socket.emit('state_update', appState);
    socket.emit('chat_history', chatHistory);

    // Listen for state changes from Master
    socket.on('update_state', (newState) => {
        appState = { ...appState, ...newState };

        // Broadcast updated state to all clients
        io.emit('state_update', appState);
    });

    // Listen for new chat messages
    socket.on('send_chat', (data) => {
        const message = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            role: data.role || 'User',
            text: data.text || '',
            fileUrl: data.fileUrl || null,
            fileName: data.fileName || null,
            fileType: data.fileType || null,
            timestamp: new Date().toISOString()
        };

        chatHistory.push(message);
        if (chatHistory.length > MAX_CHAT_HISTORY) {
            chatHistory.shift(); // Keep only the latest N messages
        }

        io.emit('chat_message', message);
    });

    // Listen for delete requests
    socket.on('delete_chat', (msgId) => {
        const msgIndex = chatHistory.findIndex(m => m.id === msgId);
        if (msgIndex !== -1) {
            const msg = chatHistory[msgIndex];
            // If it has a file, let's delete it
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
            chatHistory.splice(msgIndex, 1);
            io.emit('chat_deleted', msgId);
        }
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
