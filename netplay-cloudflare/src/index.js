import { DurableObject } from 'cloudflare:workers';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function jsonResponse(value, status = 200) {
    return new Response(JSON.stringify(value), {
        status,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
}

function text(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function packet(event, data) {
    return `42${JSON.stringify([event, data])}`;
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        const url = new URL(request.url);
        if (url.pathname === '/health') return jsonResponse({ ok: true, version: 'netplay-v2' });
        if (url.pathname === '/list') {
            const id = env.NETPLAY_ROOMS.idFromName('all-rooms');
            return env.NETPLAY_ROOMS.get(id).fetch(new Request('https://netplay.internal/list' + url.search));
        }

        if (url.pathname.startsWith('/socket.io')) {
            if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
                return new Response('WebSocket upgrade required', { status: 426, headers: corsHeaders });
            }
            const id = env.NETPLAY_ROOMS.idFromName('all-rooms');
            return env.NETPLAY_ROOMS.get(id).fetch(request);
        }

        return jsonResponse({ error: 'Not found' }, 404);
    }
};

export class NetplayRooms extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.sessions = new Map();
        this.rooms = new Map();
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/list') return this.list(url.searchParams);
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
            return new Response('WebSocket upgrade required', { status: 426 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        const socketId = crypto.randomUUID();
        server.accept();
        const session = { socket: server, roomId: null, playerId: null, pingTimer: null };
        this.sessions.set(socketId, session);
        server.addEventListener('message', (event) => this.message(socketId, String(event.data)));
        server.addEventListener('close', () => this.remove(socketId));
        server.addEventListener('error', () => this.remove(socketId));

        server.send(`0${JSON.stringify({ sid: socketId, upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 })}`);
        session.pingTimer = setInterval(() => {
            if (this.sessions.has(socketId)) server.send('2');
        }, 25000);
        return new Response(null, { status: 101, webSocket: client });
    }

    async list(params) {
        const gameId = text(params.get('game_id'), 200);
        const result = {};
        for (const [roomId, room] of this.rooms) {
            if (gameId && room.gameId !== gameId) continue;
            result[roomId] = {
                room_name: room.roomName,
                current: room.players.size,
                max: room.maxPlayers,
                hasPassword: Boolean(room.password)
            };
        }
        return jsonResponse(result);
    }

    message(socketId, raw) {
        const session = this.sessions.get(socketId);
        if (!session) return;
        if (raw === '2') return session.socket.send('3');
        if (raw === '40' || raw.startsWith('40{')) {
            // Socket.IO v3+ requires a namespace CONNECT packet containing a sid.
            return session.socket.send(`40${JSON.stringify({ sid: socketId })}`);
        }
        if (!raw.startsWith('42')) return;

        let offset = 2;
        while (/\d/.test(raw[offset] || '')) offset++;
        const ackId = offset > 2 ? raw.slice(2, offset) : null;
        let values;
        try { values = JSON.parse(raw.slice(offset)); } catch { return; }
        if (!Array.isArray(values) || typeof values[0] !== 'string') return;
        const [event, payload = {}] = values;
        const callback = (args) => {
            if (ackId !== null) session.socket.send(`43${ackId}${JSON.stringify(args)}`);
        };

        if (event === 'open-room') return this.open(socketId, payload, callback);
        if (event === 'join-room') return this.join(socketId, payload, callback);
        if (event === 'leave-room') return this.remove(socketId);
        if (event === 'data-message') return this.broadcastData(socketId, payload);
        if (event === 'webrtc-signal') return this.signal(socketId, payload);
    }

    open(socketId, payload, callback) {
        this.detachFromRoom(socketId);
        const extra = payload.extra || {};
        const gameId = text(extra.game_id, 200);
        const roomName = text(extra.room_name, 40);
        const maxPlayers = Number(payload.maxPlayers);
        if (!roomName) return callback(['Room name is required.']);
        if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) return callback(['Player count must be between 2 and 4.']);

        const roomId = text(extra.sessionid, 100) || crypto.randomUUID();
        const playerId = text(extra.userid, 100) || crypto.randomUUID();
        const player = { ...extra, game_id: gameId, room_name: roomName, userid: playerId, socketId };
        const room = { id: roomId, gameId: gameId || "general", roomName, maxPlayers, password: text(payload.password, 100), players: new Map([[playerId, player]]) };
        this.rooms.set(roomId, room);
        const session = this.sessions.get(socketId);
        session.roomId = roomId;
        session.playerId = playerId;
        callback([null]);
        this.playersUpdated(room);
    }

    join(socketId, payload, callback) {
        this.detachFromRoom(socketId);
        const extra = payload.extra || {};
        const roomId = text(extra.sessionid, 100);
        const room = this.rooms.get(roomId);
        if (!room) return callback(['Room not found.']);
        if (room.gameId && room.gameId !== 'general' && room.gameId !== text(extra.game_id, 200)) return callback(['That room is for a different game.']);
        if (room.players.size >= room.maxPlayers) return callback(['Room is full.']);
        if (room.password && text(payload.password, 100) !== room.password) return callback(['Incorrect room password.']);

        const playerId = text(extra.userid, 100) || crypto.randomUUID();
        room.players.set(playerId, { ...extra, game_id: room.gameId, room_name: room.roomName, userid: playerId, socketId });
        const session = this.sessions.get(socketId);
        session.roomId = roomId;
        session.playerId = playerId;
        callback([null, this.publicPlayers(room)]);
        this.playersUpdated(room);
    }

    publicPlayers(room) {
        return Object.fromEntries([...room.players].map(([id, player]) => [id, {
            ...player,
            admin: player.admin === true || text(player.name, 100).startsWith('[ADMIN]')
        }]));
    }

    playersUpdated(room) {
        for (const player of room.players.values()) {
            this.sessions.get(player.socketId)?.socket.send(packet('users-updated', this.publicPlayers(room)));
        }
    }

    broadcastData(socketId, data) {
        const room = this.roomFor(socketId);
        if (!room) return;
        for (const player of room.players.values()) {
            if (player.socketId !== socketId) this.sessions.get(player.socketId)?.socket.send(packet('data-message', data));
        }
    }

    signal(socketId, data) {
        const room = this.roomFor(socketId);
        const target = text(data.target, 100);
        const targetSession = this.sessions.get(target);
        if (!room || !targetSession || targetSession.roomId !== room.id) return;
        const forwarded = { ...data, sender: socketId };
        delete forwarded.target;
        targetSession.socket.send(packet('webrtc-signal', forwarded));
    }

    roomFor(socketId) {
        const roomId = this.sessions.get(socketId)?.roomId;
        return roomId ? this.rooms.get(roomId) : null;
    }

    detachFromRoom(socketId) {
        const session = this.sessions.get(socketId);
        if (!session || !session.roomId) return;
        const room = this.rooms.get(session.roomId);
        if (room && session.playerId) room.players.delete(session.playerId);
        session.roomId = null;
        session.playerId = null;
        if (!room) return;
        if (room.players.size === 0) this.rooms.delete(room.id);
        else this.playersUpdated(room);
    }

    remove(socketId) {
        const session = this.sessions.get(socketId);
        if (!session) return;
        const room = session.roomId ? this.rooms.get(session.roomId) : null;
        if (room && session.playerId) room.players.delete(session.playerId);
        if (session.pingTimer) clearInterval(session.pingTimer);
        this.sessions.delete(socketId);
        if (!room) return;
        if (room.players.size === 0) this.rooms.delete(room.id);
        else this.playersUpdated(room);
    }
}
