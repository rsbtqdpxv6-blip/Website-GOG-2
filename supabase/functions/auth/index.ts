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
    "Access-Control-Allow-Methods": "DELETE, GET, POST, PUT, OPTIONS",
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

function isAdmin(username: string) {
    const configuredAdmins = (Deno.env.get("ADMIN_USERNAMES") || "")
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean);
    return configuredAdmins.includes(username.toLowerCase());
}

async function currentUser(request: Request) {
    const token = cookieToken(request);
    if (!token) return null;
    const tokenHash = await hashToken(token);
    const { data: session } = await supabase.from("arcade_sessions").select("user_id").eq("token_hash", tokenHash).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!session) return null;
    const { data: user } = await supabase.from("arcade_users").select("id, username, display_name, account_data").eq("id", session.user_id).maybeSingle();
    if (!user || await isBanned(user.username)) return null;
    return user;
}

async function isBanned(username: string) {
    const { data, error } = await supabase.from("arcade_bans").select("username_normalized").eq("username_normalized", username.toLowerCase()).maybeSingle();
    if (error) throw error;
    return Boolean(data);
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
            if (await isBanned(username)) return json({ error: "That username is banned." }, 403, request);
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
            if (user && await isBanned(user.username)) return json({ error: "This account is banned." }, 403, request);
            if (!user || typeof password !== "string" || !(await verifyPassword(password, user.password_hash))) return json({ error: "Incorrect username or password." }, 401, request);
            const response = json({ username: user.username, name: user.display_name }, 200, request);
            await createSession(user.id, response);
            return response;
        }
        if (route === "site-effect" && request.method === "GET") {
            const { data, error } = await supabase.from("arcade_site_effects").select("effect").eq("id", 1).maybeSingle();
            if (error) throw error;
            return json(data || { effect: null }, 200, request);
        }
        if (route === "poll-votes" && request.method === "GET") {
            const pollId = new URL(request.url).searchParams.get("pollId") || "";
            if (!/^[0-9a-f-]{36}$/i.test(pollId)) return json({ error: "Invalid poll." }, 400, request);
            const { data, error } = await supabase.from("arcade_poll_votes").select("option").eq("poll_id", pollId);
            if (error) throw error;
            const votes: Record<string, number> = {};
            (data || []).forEach((vote) => { votes[vote.option] = (votes[vote.option] || 0) + 1; });
            return json({ votes, total: data?.length || 0 }, 200, request);
        }
        if (route === "poll-votes" && request.method === "POST") {
            const payload = await request.json();
            const pollId = String(payload?.pollId || "");
            const voterId = String(payload?.voterId || "");
            const option = String(payload?.option || "").slice(0, 40);
            if (!/^[0-9a-f-]{36}$/i.test(pollId) || !/^[0-9a-f-]{36}$/i.test(voterId) || !option) return json({ error: "Invalid poll vote." }, 400, request);
            const { data: current } = await supabase.from("arcade_site_effects").select("effect").eq("id", 1).maybeSingle();
            if (current?.effect?.id !== pollId || current.effect.type !== "poll" || !current.effect.options.includes(option)) return json({ error: "This poll is no longer active." }, 409, request);
            const { error } = await supabase.from("arcade_poll_votes").upsert({ poll_id: pollId, voter_id: voterId, option }, { onConflict: "poll_id,voter_id" });
            if (error) throw error;
            return json({ ok: true }, 200, request);
        }
        if (route === "ban" && request.method === "GET") {
            const user = await currentUser(request);
            if (!user || !isAdmin(user.username)) return json({ error: "Admin access required." }, 403, request);
            const { data, error } = await supabase.from("arcade_bans").select("username, reason, banned_at, banned_by").order("banned_at", { ascending: false });
            if (error) throw error;
            return json({ bans: data || [] }, 200, request);
        }
        const user = await currentUser(request);
        if (!user) return json({ error: "You are not signed in." }, 401, request);
        if (route === "ban" && !isAdmin(user.username)) return json({ error: "Admin access required." }, 403, request);
        if (route === "ban" && request.method === "PUT") {
            const payload = await request.json();
            const username = String(payload?.username || "").trim();
            if (!usernamePattern.test(username)) return json({ error: "Enter a valid username." }, 400, request);
            if (username.toLowerCase() === user.username.toLowerCase()) return json({ error: "You cannot ban your own admin account." }, 400, request);
            const { data: target, error: targetError } = await supabase.from("arcade_users").select("id, username").ilike("username", username).maybeSingle();
            if (targetError) throw targetError;
            const { error } = await supabase.from("arcade_bans").upsert({
                username_normalized: (target?.username || username).toLowerCase(),
                username: target?.username || username,
                reason: String(payload?.reason || "").slice(0, 200),
                banned_by: user.username
            });
            if (error) throw error;
            if (target) {
                const { error: sessionError } = await supabase.from("arcade_sessions").delete().eq("user_id", target.id);
                if (sessionError) throw sessionError;
            }
            return json({ ok: true, matchedAccount: Boolean(target) }, 200, request);
        }
        if (route === "ban" && request.method === "DELETE") {
            const username = new URL(request.url).searchParams.get("username")?.trim() || "";
            if (!usernamePattern.test(username)) return json({ error: "Enter a valid username." }, 400, request);
            const { error } = await supabase.from("arcade_bans").delete().eq("username_normalized", username.toLowerCase());
            if (error) throw error;
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }
        if (route === "points" && request.method === "PUT") {
            if (!isAdmin(user.username)) return json({ error: "Admin access required." }, 403, request);
            const payload = await request.json();
            const username = String(payload?.username || "").trim();
            const amount = Number(payload?.amount);
            if (!usernamePattern.test(username) || !Number.isInteger(amount) || amount < 1 || amount > 100000) return json({ error: "Enter a valid username and points amount." }, 400, request);
            const { data: target, error: targetError } = await supabase.from("arcade_users").select("id, username, account_data").ilike("username", username).maybeSingle();
            if (targetError) throw targetError;
            if (!target) return json({ error: "That account does not exist." }, 404, request);
            const accountData = target.account_data && typeof target.account_data === "object" ? target.account_data : { data: {}, saves: {} };
            const data = accountData.data && typeof accountData.data === "object" ? accountData.data : {};
            let achievementState = {};
            try { achievementState = JSON.parse(typeof data.arcadeAchievements === "string" ? data.arcadeAchievements : "{}"); } catch { achievementState = {}; }
            const bonusPoints = (Number.isInteger(achievementState.bonusPoints) ? achievementState.bonusPoints : 0) + amount;
            data.arcadeAchievements = JSON.stringify({ ...achievementState, bonusPoints });
            const { error } = await supabase.from("arcade_users").update({ account_data: { ...accountData, data } }).eq("id", target.id);
            if (error) throw error;
            return json({ ok: true, username: target.username, bonusPoints }, 200, request);
        }
        if (route === "site-effect" && !isAdmin(user.username)) return json({ error: "Admin access required." }, 403, request);
        if (route === "site-effect" && request.method === "PUT") {
            const payload = await request.json();
            const type = ["flash", "confetti", "gif", "poll", "sound"].includes(payload?.type) ? payload.type : null;
            if (!type) return json({ error: "Invalid site effect." }, 400, request);
            const asset = typeof payload.asset === "string" && payload.asset.length <= 200 && !payload.asset.includes("..")
                ? payload.asset
                : undefined;
            const effect = {
                id: crypto.randomUUID(),
                type,
                message: typeof payload.message === "string" ? payload.message.slice(0, 100) : "The admin was here",
                durationMs: Math.min(Math.max(Number(payload.durationMs) || 15000, 1000), 120000),
                issuedAt: Date.now(),
                ...(type === "gif" && asset ? { asset } : {}),
                ...(type === "sound" && asset ? { asset, volume: Math.min(Math.max(Number(payload.volume) || 1, 0), 1) } : {}),
                ...(type === "poll" ? {
                    title: typeof payload.title === "string" ? payload.title.slice(0, 120) : "Quick poll",
                    options: Array.isArray(payload.options) && payload.options.length >= 2
                        ? payload.options.slice(0, 4).map((option: unknown) => String(option).slice(0, 40))
                        : ["Yes", "No"]
                } : {})
            };
            const { error } = await supabase.from("arcade_site_effects").update({ effect, updated_at: new Date().toISOString() }).eq("id", 1);
            if (error) throw error;
            return json({ effect }, 200, request);
        }
        if (route === "site-effect" && request.method === "DELETE") {
            const { error } = await supabase.from("arcade_site_effects").update({ effect: null, updated_at: new Date().toISOString() }).eq("id", 1);
            if (error) throw error;
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }
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
