import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
function corsHeaders(request?: Request) {
    const configuredOrigin = Deno.env.get("FRONTEND_ORIGIN");
    const requestOrigin = request?.headers.get("origin");
    const normalizedConfiguredOrigin = configuredOrigin
        ? new URL(configuredOrigin).origin
        : undefined;
    const allowOrigin = normalizedConfiguredOrigin && requestOrigin && requestOrigin === normalizedConfiguredOrigin
        ? requestOrigin
        : requestOrigin || normalizedConfiguredOrigin || "null";
    return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Vary": "Origin",
    };
};
const usernamePattern = /^[a-zA-Z0-9_]{3,24}$/;
const sessionDays = 30;

function json(body: unknown, status = 200, request?: Request) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

async function hashToken(token: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt = crypto.randomUUID()) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 210000, hash: "SHA-256" }, key, 256);
    return `${salt}:${Array.from(new Uint8Array(bits)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function verifyPassword(password: string, stored: string) {
    const [salt, expected] = stored.split(":");
    const actual = await hashPassword(password, salt);
    return actual === `${salt}:${expected}`;
}

function cookieToken(request: Request) {
    return request.headers.get("cookie")?.match(/(?:^|; )arcade_session=([^;]+)/)?.[1];
}

async function currentUser(request: Request) {
    const token = cookieToken(request);
    if (!token) return null;
    const tokenHash = await hashToken(token);
    const { data: session } = await supabase.from("arcade_sessions").select("user_id").eq("token_hash", tokenHash).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!session) return null;
    const { data: user } = await supabase.from("arcade_users").select("id, username, display_name, account_data").eq("id", session.user_id).maybeSingle();
    return user;
}

async function createSession(userId: string, response: Response) {
    const token = crypto.randomUUID() + crypto.randomUUID();
    await supabase.from("arcade_sessions").insert({ token_hash: await hashToken(token), user_id: userId, expires_at: new Date(Date.now() + sessionDays * 86400000).toISOString() });
    response.headers.set("Set-Cookie", `arcade_session=${token}; Max-Age=${sessionDays * 86400}; Path=/; HttpOnly; SameSite=None; Secure`);
}

Deno.serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
    const url = new URL(request.url);
    const route = url.pathname.split("/").filter(Boolean).pop();
    try {
        if (route === "signup" && request.method === "POST") {
            const { username, password, name } = await request.json();
            if (!usernamePattern.test(username || "") || typeof password !== "string" || password.length < 8 || password.length > 128) return json({ error: "Use a valid username and an 8-128 character password." }, 400, request);
            const { data: existing } = await supabase.from("arcade_users").select("id").eq("username_normalized", username.toLowerCase()).maybeSingle();
            if (existing) return json({ error: "That username is already taken." }, 409, request);
            const { data: user, error } = await supabase.from("arcade_users").insert({ username, display_name: String(name || "").slice(0, 40), password_hash: await hashPassword(password) }).select("id, username, display_name").single();
            if (error) throw error;
            const response = json({ username: user.username, name: user.display_name }, 201, request);
            await createSession(user.id, response);
            return response;
        }
        if (route === "signin" && request.method === "POST") {
            const { username, password } = await request.json();
            const { data: user } = await supabase.from("arcade_users").select("id, username, display_name, password_hash").eq("username_normalized", String(username || "").toLowerCase()).maybeSingle();
            if (!user || typeof password !== "string" || !(await verifyPassword(password, user.password_hash))) return json({ error: "Incorrect username or password." }, 401, request);
            const response = json({ username: user.username, name: user.display_name }, 200, request);
            await createSession(user.id, response);
            return response;
        }
        const user = await currentUser(request);
        if (!user) return json({ error: "You are not signed in." }, 401, request);
        if (route === "me" && request.method === "GET") return json({ username: user.username, name: user.display_name }, 200, request);
        if (route === "data" && request.method === "GET") return json(user.account_data || { data: {}, saves: {} }, 200, request);
        if (route === "data" && request.method === "PUT") {
            const payload = await request.json();
            const { error } = await supabase.from("arcade_users").update({ account_data: payload }).eq("id", user.id);
            if (error) throw error;
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }
        if (route === "signout" && request.method === "POST") {
            const token = cookieToken(request);
            if (token) await supabase.from("arcade_sessions").delete().eq("token_hash", await hashToken(token));
            const response = new Response(null, { status: 204, headers: corsHeaders(request) });
            response.headers.set("Set-Cookie", "arcade_session=; Max-Age=0; Path=/; HttpOnly; SameSite=None; Secure");
            return response;
        }
        return json({ error: "Not found." }, 404, request);
    } catch (error) {
        console.error(error);
        return json({ error: "Authentication service error." }, 500, request);
    }
});
