import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();
const port = Number(process.env.PORT || 8787);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5500';
const sessionDays = Number(process.env.SESSION_DAYS || 30);
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const authLimit = Number(process.env.AUTH_RATE_LIMIT || 30);
const isLocalDevelopment = frontendOrigin.includes('localhost') || frontendOrigin.includes('127.0.0.1');
const legacyDatabasePath = new URL('./auth.json', import.meta.url);
const databasePath = process.env.AUTH_DATA_PATH || path.join(os.homedir(), '.wesleys-games-auth.json');

function loadDatabase() {
    try {
        if (!fs.existsSync(databasePath) && fs.existsSync(legacyDatabasePath)) {
            fs.copyFileSync(legacyDatabasePath, databasePath);
        }
        return JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    }
    catch { return { users: [], sessions: [] }; }
}

let database = loadDatabase();
function saveDatabase() { fs.writeFileSync(databasePath, JSON.stringify(database, null, 2)); }

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: '8mb' }));
const rateLimitOptions = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isLocalDevelopment,
    handler: (_request, response, _next, options) => response.status(429).json(options.message)
};
app.use(rateLimit({ ...rateLimitOptions, limit: 100, message: { error: 'Too many requests. Try again later.' } }));

const cookieOptions = `Path=/; HttpOnly; SameSite=Lax${cookieSecure ? '; Secure' : ''}`;
const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, expected] = storedHash.split(':');
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

function createSession(user, response) {
    const token = crypto.randomBytes(32).toString('base64url');
    database.sessions = database.sessions.filter((session) => session.expiresAt > Date.now());
    database.sessions.push({ tokenHash: tokenHash(token), username: user.username, expiresAt: Date.now() + sessionDays * 86400000 });
    saveDatabase();
    response.setHeader('Set-Cookie', `arcade_session=${token}; Max-Age=${sessionDays * 86400}; ${cookieOptions}`);
}

function currentUser(request) {
    const token = request.headers.cookie?.match(/(?:^|; )arcade_session=([^;]+)/)?.[1];
    const session = database.sessions.find((item) => item.tokenHash === tokenHash(token || '') && item.expiresAt > Date.now());
    return session ? database.users.find((user) => user.username.toLowerCase() === session.username.toLowerCase()) : null;
}

function requireUser(request, response, next) {
    request.user = currentUser(request);
    if (!request.user) return response.status(401).json({ error: 'You are not signed in.' });
    return next();
}

const authLimiter = rateLimit({ ...rateLimitOptions, limit: authLimit, message: { error: `Too many sign-in attempts. Try again in 15 minutes.` } });

app.post('/auth/signup', authLimiter, (request, response) => {
    const { username, password, name } = request.body || {};
    if (!usernamePattern.test(username || '')) return response.status(400).json({ error: 'Username must be 3-24 letters, numbers, or underscores.' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) return response.status(400).json({ error: 'Password must be 8-128 characters.' });
    if (database.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) return response.status(409).json({ error: 'That username is already taken.' });
    const user = { username, name: typeof name === 'string' ? name.slice(0, 40) : '', passwordHash: hashPassword(password), data: {}, saves: {} };
    database.users.push(user);
    createSession(user, response);
    return response.status(201).json({ username: user.username, name: user.name });
});

app.post('/auth/signin', authLimiter, (request, response) => {
    const { username, password } = request.body || {};
    const user = database.users.find((item) => item.username.toLowerCase() === String(username || '').toLowerCase());
    if (!user || typeof password !== 'string' || !verifyPassword(password, user.passwordHash)) return response.status(401).json({ error: 'Incorrect username or password.' });
    createSession(user, response);
    return response.json({ username: user.username, name: user.name });
});

app.get('/auth/me', requireUser, (request, response) => response.json({ username: request.user.username, name: request.user.name }));

app.get('/auth/data', requireUser, (request, response) => response.json({ data: request.user.data || {}, saves: request.user.saves || {} }));

app.put('/auth/data', requireUser, (request, response) => {
    const { data, saves } = request.body || {};
    if (!data || typeof data !== 'object' || Array.isArray(data) || !saves || typeof saves !== 'object' || Array.isArray(saves)) {
        return response.status(400).json({ error: 'Invalid account data.' });
    }
    if (JSON.stringify({ data, saves }).length > 7 * 1024 * 1024) return response.status(413).json({ error: 'Account data is too large.' });
    request.user.data = data;
    request.user.saves = saves;
    saveDatabase();
    return response.status(204).end();
});

app.post('/auth/signout', (request, response) => {
    const token = request.headers.cookie?.match(/(?:^|; )arcade_session=([^;]+)/)?.[1];
    database.sessions = database.sessions.filter((session) => session.tokenHash !== tokenHash(token || ''));
    saveDatabase();
    response.setHeader('Set-Cookie', `arcade_session=; Max-Age=0; ${cookieOptions}`);
    return response.status(204).end();
});

app.listen(port, () => console.log(`Auth server listening on http://localhost:${port}`));
