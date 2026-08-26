import http from 'node:http';
import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
const httpServer = http.createServer(app);
const port = Number(process.env.PORT || 8080);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const rooms = new Map();

const corsOptions = {
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST']
};

app.use(cors(corsOptions));
app.get('/health', (_request, response) => response.json({ ok: true, rooms: rooms.size }));
app.get('/list', (request, response) => {
    const gameId = String(request.query.game_id || '');
    const result = {};

    for (const [roomId, room] of rooms) {
        if (gameId && room.gameId !== gameId) continue;
        result[roomId] = {
            room_name: room.roomName,
            current: room.players.size,
            max: room.maxPlayers,
            hasPassword: Boolean(room.password)
        };
    }

    response.json(result);
});

const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling']
});

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function publicPlayers(room) {
    const players = {};
    for (const [playerId, player] of room.players) {
        players[playerId] = { ...player, socketId: player.socketId };
    }
    return players;
}

function broadcastPlayers(room) {
    io.to(room.id).emit('users-updated', publicPlayers(room));
}

function removeFromRoom(socket) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    socket.leave(roomId);
    socket.data.roomId = null;
    if (!room) return;

    for (const [playerId, player] of room.players) {
        if (player.socketId === socket.id) room.players.delete(playerId);
    }

    if (room.players.size === 0) {
        rooms.delete(roomId);
    } else {
        broadcastPlayers(room);
    }
}

io.on('connection', (socket) => {
    socket.on('open-room', (payload = {}, callback = () => {}) => {
        removeFromRoom(socket);

        const extra = payload.extra || {};
        const gameId = cleanText(extra.game_id, 200);
        const roomName = cleanText(extra.room_name, 40);
        const maxPlayers = Number(payload.maxPlayers);
        const password = cleanText(payload.password, 100);
        const playerId = cleanText(extra.userid, 100) || crypto.randomUUID();

        if (!gameId || !roomName) return callback('Game ID and room name are required.');
        if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) return callback('Player count must be between 2 and 4.');

        const roomId = cleanText(extra.sessionid, 100) || crypto.randomUUID();
        const player = {
            ...extra,
            game_id: gameId,
            room_name: roomName,
            userid: playerId,
            socketId: socket.id
        };
        const room = { id: roomId, gameId, roomName, maxPlayers, password, players: new Map([[playerId, player]]) };
        rooms.set(roomId, room);
        socket.data.roomId = roomId;
        socket.join(roomId);
        callback(null);
        broadcastPlayers(room);
    });

    socket.on('join-room', (payload = {}, callback = () => {}) => {
        removeFromRoom(socket);

        const extra = payload.extra || {};
        const roomId = cleanText(extra.sessionid, 100);
        const room = rooms.get(roomId);
        if (!room) return callback('Room not found.');
        if (room.gameId !== cleanText(extra.game_id, 200)) return callback('That room is for a different game.');
        if (room.players.size >= room.maxPlayers) return callback('Room is full.');
        if (room.password && cleanText(payload.password, 100) !== room.password) return callback('Incorrect room password.');

        const playerId = cleanText(extra.userid, 100) || crypto.randomUUID();
        room.players.set(playerId, {
            ...extra,
            game_id: room.gameId,
            room_name: room.roomName,
            userid: playerId,
            socketId: socket.id
        });
        socket.data.roomId = roomId;
        socket.join(roomId);
        callback(null, publicPlayers(room));
        broadcastPlayers(room);
    });

    socket.on('leave-room', () => removeFromRoom(socket));

    socket.on('data-message', (data) => {
        const roomId = socket.data.roomId;
        if (roomId && rooms.has(roomId)) socket.to(roomId).emit('data-message', data);
    });

    socket.on('webrtc-signal', (data = {}) => {
        const roomId = socket.data.roomId;
        const target = cleanText(data.target, 100);
        if (!roomId || !rooms.has(roomId) || !target) return;
        const targetSocket = io.sockets.sockets.get(target);
        if (!targetSocket || targetSocket.data.roomId !== roomId) return;
        const { target: _target, ...signal } = data;
        targetSocket.emit('webrtc-signal', { ...signal, sender: socket.id });
    });

    socket.on('disconnect', () => removeFromRoom(socket));
});

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Netplay server listening on port ${port}`);
});
