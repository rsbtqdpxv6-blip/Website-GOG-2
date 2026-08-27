

let emulatorReady = false;

// Set window.ARCADE_NETPLAY_SERVER before loading this file to use a deployed server.
const netplayServerUrl = window.ARCADE_NETPLAY_SERVER || "";
const netplayIceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
];

/**
 * Strips a local ROM path down to a clean alphanumeric identifier token.
 */
function getCleanGameToken(romPath) {
    return romPath.split('/').pop().split('.').shift().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

async function loadGameCheats(game) {
    const romPath = String(game?.rom_path || "").replace(/\\/g, "/");
    const pathParts = romPath.split('/');
    const romsIndex = pathParts.findIndex((part) => part.toLowerCase() === "roms");
    const system = romsIndex >= 0 ? pathParts[romsIndex + 1] : "";
    if (!system || !game?.title) return [];

    try {
        const cheatBase = `assets/roms/${encodeURIComponent(system)}`;
        const indexUrl = new URL(`${cheatBase}/${encodeURIComponent(system)}-index.json`, window.location.href);
        const indexResponse = await fetch(indexUrl, { cache: "no-store" });
        let cheatDatabase;
        if (indexResponse.ok) {
            const cheatIndex = await indexResponse.json();
            const romFilename = pathParts[pathParts.length - 1] || "";
            const romTitle = romFilename.replace(/\.[^.]+$/, "");
            const titleCandidates = [game.title, romTitle].filter(Boolean);
            const normalizeTitle = (title) => title
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
            const chunkName = titleCandidates
                .map(normalizeTitle)
                .map((title) => cheatIndex[title])
                .find(Boolean);
            if (!chunkName) return [];
            const chunkResponse = await fetch(new URL(`${cheatBase}/cheats/${encodeURIComponent(chunkName)}`, window.location.href), { cache: "no-store" });
            if (!chunkResponse.ok) return [];
            cheatDatabase = await chunkResponse.json();
        } else {
            const response = await fetch(new URL(`${cheatBase}/${encodeURIComponent(system)}.json`, window.location.href), { cache: "no-store" });
            if (!response.ok) return [];
            cheatDatabase = await response.json();
        }
        const romFilename = pathParts[pathParts.length - 1] || "";
        const romTitle = romFilename.replace(/\.[^.]+$/, "");
        const titleCandidates = [game.title, romTitle].filter(Boolean);
        const normalizeTitle = (title) => title
            .toLowerCase()
            .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
            .replace(/[^a-z0-9]/g, "");

        for (const title of titleCandidates) {
            if (Array.isArray(cheatDatabase[title])) return toEmulatorJsCheats(cheatDatabase[title]);
            const matchingKey = Object.keys(cheatDatabase).find((key) => key.toLowerCase() === title.toLowerCase());
            if (matchingKey && Array.isArray(cheatDatabase[matchingKey])) return toEmulatorJsCheats(cheatDatabase[matchingKey]);
        }

        const normalizedCandidates = new Set(titleCandidates.map(normalizeTitle));
        const normalizedMatches = Object.entries(cheatDatabase)
            .filter(([key, cheats]) => normalizedCandidates.has(normalizeTitle(key)) && Array.isArray(cheats))
            .flatMap(([, cheats]) => cheats);
        if (normalizedMatches.length > 0) return toEmulatorJsCheats(normalizedMatches);

        const baseNormalizeTitle = (title) => normalizeTitle(title.replace(/\([^)]*\)|\[[^\]]*\]/g, ""));
        const regionPreference = ["usa", "world", "europe", "japan"];
        for (const candidate of titleCandidates) {
            const baseTitle = baseNormalizeTitle(candidate);
            const compatibleKeys = Object.keys(cheatDatabase)
                .filter((key) => baseNormalizeTitle(key) === baseTitle && Array.isArray(cheatDatabase[key]));
            if (compatibleKeys.length === 0) continue;
            const preferredKey = compatibleKeys.sort((left, right) => {
                const leftRegion = regionPreference.findIndex((region) => left.toLowerCase().includes(region));
                const rightRegion = regionPreference.findIndex((region) => right.toLowerCase().includes(region));
                return (leftRegion < 0 ? regionPreference.length : leftRegion)
                    - (rightRegion < 0 ? regionPreference.length : rightRegion);
            })[0];
            return toEmulatorJsCheats(cheatDatabase[preferredKey]);
        }

        return [];
    } catch (error) {
        console.warn("Unable to load game cheats:", error);
        return [];
    }
}

function toEmulatorJsCheats(cheats) {
    return cheats
        .filter((cheat) => cheat
            && typeof cheat.desc === "string"
            && cheat.desc.trim()
            && typeof cheat.code === "string"
            && cheat.code.trim())
        .map((cheat) => [cheat.desc.trim(), cheat.code.trim()]);
}

/**
 * Initializes a persistent, limitless IndexedDB database specifically for 
 * saving full 3D emulator save states, completely bypassing localStorage bounds.
 */
function openArcadeIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ArcadeInfiniteSaves", 1);
        request.onupgradeneeded = (e) => {
            const dbInstance = e.target.result;
            if (!dbInstance.objectStoreNames.contains("game_save_states")) {
                dbInstance.createObjectStore("game_save_states");
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Dynamically constructs an isolated sandbox frame document to stream core engine
 * modules directly from your LOCAL emulatorjs/data folder structure.
 */
async function launchGame(game, hintsDisplay) {
    const emuOverlay = document.getElementById('emu-overlay');
    const iframe = document.getElementById('emu-sandbox-frame');
    if (!emuOverlay || !iframe) return;

    emuOverlay.style.display = "block";
    window.__arcadeActiveRuntimeGame = game;
    window.dispatchEvent(new CustomEvent('arcade-session-state-changed', { detail: { game } }));
    emulatorReady = false;

    // Resolve clean absolute web paths for your local resources to prevent CORS bugs
    const absoluteLocation = new URL(game.rom_path, window.location.href).href;
    const gameToken = getCleanGameToken(game.rom_path);
    const projectRootUrl = window.location.origin + window.location.pathname.replace('index.html', '');

    let sandboxedHTML = "";

    // --- CASE A: OFFLINE LOCAL RUFFLE FOR FLASH GAMES (.SWF) ---
    if (game.core === "ruffle" || game.rom_path.toLowerCase().endsWith('.swf')) {
        if (hintsDisplay) hintsDisplay.textContent = `Initializing Flash Engine... Playing ${game.title}`;

        sandboxedHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body, html { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; display:flex; justify-content:center; align-items:center; }
                    #flash-viewport { width:100%; height:100%; display:flex; justify-content:center; align-items:center; }
                    #flash-viewport ruffle-player, #flash-viewport ruffle-embed { width:100% !important; height:100% !important; }
                </style>
                <script src="${projectRootUrl}ruffle/ruffle.js"></script>
            </head>
            <body>
                <div id="flash-viewport"></div>
                <script>
                    window.addEventListener("DOMContentLoaded", function() {
                        const ruffleInstance = window.RufflePlayer.newest();
                        const player = ruffleInstance.createPlayer();
                        document.getElementById("flash-viewport").appendChild(player);
                        player.load({ url: "${absoluteLocation}", autoplay: "on", allowScriptAccess: false });
                    });
                </script>
            </body>
            </html>
        `;
    } 
    // --- CASE B: 100% LOCAL EMULATORJS WITH BYPASSED INDEXEDDB BINARY RESTORATION ---
    else {
        if (hintsDisplay) hintsDisplay.textContent = "Mounting local backend emulation modules...";

        const gameCheats = (await loadGameCheats(game)).slice(0, 64);

        // Extract the binary array slice out of your local hard drive IndexedDB tables first
        let localBinaryState = null;
        try {
            {
                const dbInstance = await openArcadeIndexedDB();
                localBinaryState = await new Promise((res) => {
                    const getReq = dbInstance.transaction("game_save_states", "readonly").objectStore("game_save_states").get(gameToken);
                    getReq.onsuccess = () => res(getReq.result);
                    getReq.onerror = () => res(null);
                });
            }
        } catch (dbErr) { console.error("Database tracking fault:", dbErr); }

        // Encode the binary state data to a safe base64 packet string for instant injection
        let embeddedBase64State = "";
        if (localBinaryState instanceof Uint8Array) {
            let chunkString = "";
            for (let i = 0; i < localBinaryState.length; i++) {
                chunkString += String.fromCharCode(localBinaryState[i]);
            }
            embeddedBase64State = btoa(chunkString);
        }

        // Detect if running a DOS program inside EmulatorJS to adjust command parameters
        let isDosGame = (game.core === "dosbox" || game.rom_path.toLowerCase().endsWith('.exe'));
        let dosExecutableMapping = isDosGame ? `window.EJS_dosboxExtension = "${game.rom_path.split('.').pop().toLowerCase()}";` : "";
        const threadedCoresEnabled = window.crossOriginIsolated === true && window.__arcadeEmulatorSettings?.threadedCores === true;
        const gameId = Number.isInteger(game.game_id) && game.game_id > 0 ? game.game_id : 1;

        sandboxedHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <link rel="stylesheet" href="${projectRootUrl}emulatorjs/data/emulator.css">
                <style>
                    body, html { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; }
                    #game-deck { width:100%; height:100%; }
                </style>
            </head>
            <body>
                <div id="game-deck"></div>
                <script>
                    window.EJS_player = "#game-deck";
                    window.EJS_core = isNaN("${game.core}") ? "${game.core}" : "dosbox";
                    window.EJS_gameUrl = "${absoluteLocation}";
                    window.EJS_gameID = ${gameId};
                    window.EJS_gameName = ${JSON.stringify(game.title || "")};
                    window.EJS_cheats = [];
                    window.__arcadePendingCheats = ${JSON.stringify(gameCheats)};
                    window.EJS_pathtodata = "${projectRootUrl}emulatorjs/data/"; 
                    // Signaling server used to coordinate the two EmulatorJS peers.
                    window.EJS_netplayServer = ${JSON.stringify(netplayServerUrl)};
                    // STUN servers used by WebRTC to discover a direct peer connection.
                    window.EJS_netplayICEServers = ${JSON.stringify(netplayIceServers)};
                    window.EJS_language = "en-US";
                    window.EJS_startOnLoaded = true;
                    window.EJS_threads = ${threadedCoresEnabled};
                    window.EJS_cacheConfig = {
                        enabled: true,
                        cacheMaxSizeMB: 256,   // Lower memory usage from the previous 4 GB default
                        cacheMaxAgeMins: 120   // Keep cache data shorter-lived to reduce footprint
                    };
                    // EmulatorJS loads Socket.IO asynchronously; keep Netplay on the Worker WebSocket endpoint.
                    window.__arcadeForceNetplayWebSocket = function() {
                        if (typeof window.io !== "function" || window.io.__arcadeWebSocketOnly) return;
                        const socketIo = window.io;
                        window.io = function(url, options = {}) {
                            return socketIo(url, { ...options, transports: ["websocket"] });
                        };
                        window.io.__arcadeWebSocketOnly = true;
                    };
                    const netplayTransportTimer = window.setInterval(window.__arcadeForceNetplayWebSocket, 25);
                    const netplayMenuObserver = new MutationObserver(() => {
                        const netplayPopup = Array.from(document.querySelectorAll(".ejs_popup_container"))
                            .find((popup) => popup.textContent.includes("Netplay"));
                        if (!netplayPopup || netplayPopup.querySelector(".arcade-hardcoded-join-button")) return;
                        const joinButton = document.createElement("button");
                        joinButton.type = "button";
                        joinButton.className = "ejs_button_button arcade-hardcoded-join-button";
                        joinButton.textContent = "Join by Code";
                        joinButton.style.cssText = "display:block;margin:10px auto;position:relative;z-index:10000";
                        joinButton.addEventListener("click", () => {
                            const roomCode = window.prompt("Enter the host join code:");
                            if (!roomCode || !window.EJS_emulator?.netplay) return;
                            const password = window.prompt("Room password (optional):") || null;
                            window.EJS_emulator.netplay.joinRoom(roomCode.trim(), "Netplay Room", 4, password);
                        });
                        const popupBody = netplayPopup.querySelector(".ejs_popup_body") || netplayPopup;
                        popupBody.prepend(joinButton);
                    });
                    netplayMenuObserver.observe(document.body, { childList: true, subtree: true });
                    const installRoomCodeHook = () => {
                        const activeNetplay = window.EJS_emulator && window.EJS_emulator.netplay;
                        if (!activeNetplay || activeNetplay.__arcadeRoomCodeHooked) return Boolean(activeNetplay);
                        const originalRoomJoined = activeNetplay.roomJoined.bind(activeNetplay);
                        activeNetplay.roomJoined = function(isOwner, roomName, password, roomId) {
                            const result = originalRoomJoined(isOwner, roomName, password, roomId);
                            const joinedSection = activeNetplay._joinedDiv;
                            if (joinedSection && !joinedSection.querySelector(".arcade-room-code")) {
                                const code = document.createElement("div");
                                code.className = "arcade-room-code";
                                code.style.cssText = "display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0;padding:8px 12px;color:#fff;background:rgba(0,229,255,.2);border:1px solid rgba(0,229,255,.6);border-radius:4px;text-align:center;overflow-wrap:anywhere";
                                const codeText = document.createElement("span");
                                codeText.textContent = "Join code: " + roomId;
                                const copyButton = document.createElement("button");
                                copyButton.type = "button";
                                copyButton.className = "ejs_button_button arcade-copy-room-code";
                                copyButton.textContent = "Copy";
                                copyButton.style.cssText = "padding:4px 9px;font-size:12px";
                                copyButton.addEventListener("click", async () => {
                                    try {
                                        await navigator.clipboard.writeText(String(roomId));
                                    } catch (error) {
                                        const fallback = document.createElement("textarea");
                                        fallback.value = String(roomId);
                                        fallback.style.position = "fixed";
                                        fallback.style.opacity = "0";
                                        document.body.appendChild(fallback);
                                        fallback.select();
                                        document.execCommand("copy");
                                        fallback.remove();
                                    }
                                    copyButton.textContent = "Copied";
                                    window.setTimeout(() => { copyButton.textContent = "Copy"; }, 1500);
                                });
                                code.append(codeText, copyButton);
                                joinedSection.insertBefore(code, joinedSection.firstChild);
                            }
                            return result;
                        };
                        activeNetplay.__arcadeRoomCodeHooked = true;
                        return true;
                    };
                    const roomCodeHookTimer = window.setInterval(() => {
                        if (installRoomCodeHook()) window.clearInterval(roomCodeHookTimer);
                    }, 100);
                    ${dosExecutableMapping}

                    window.EJS_onLoad = function() {
                        window.__arcadeForceNetplayWebSocket();
                        window.clearInterval(netplayTransportTimer);
                        window.parent.postMessage("EMULATOR_STATE_READY", "*");

                        const pendingNetplay = window.parent.__arcadePendingNetplay;
                        const netplay = window.EJS_emulator && window.EJS_emulator.netplay;
                        const installAdminIdentity = async () => {
                            const activeNetplay = window.EJS_emulator?.netplay;
                            if (!activeNetplay || activeNetplay.__arcadeAdminIdentityInstalled) return Boolean(activeNetplay?.__arcadeAdminIdentityInstalled);
                            let accountUser = null;
                            try { accountUser = JSON.parse(window.parent.localStorage.getItem("arcadeAuthUser") || "null"); } catch {}
                            const username = String(accountUser?.username || "Player").trim() || "Player";
                            let identity = {};
                            activeNetplay.name = username;
                            try {
                                const response = await fetch("${projectRootUrl}chat-identities.json", { cache: "no-store" });
                                const identities = (await response.json()).users || [];
                                identity = identities.find((entry) => String(entry.username || "").toLowerCase() === String(accountUser.username).toLowerCase()) || {};
                            } catch {}
                            const tagName = () => {
                                const cleanName = username.replace(/^(?:\[[^\]]+\]\s*)+/i, "");
                                const tag = String(identity.chatTag || "").trim();
                                activeNetplay.name = tag ? tag + " " + cleanName : cleanName;
                            };
                            ["openMenu", "openRoom", "joinRoom", "chatSendMessage"].forEach((methodName) => {
                                const original = activeNetplay[methodName];
                                if (typeof original !== "function") return;
                                activeNetplay[methodName] = function(...args) {
                                    tagName();
                                    return original.apply(this, args);
                                };
                            });
                            activeNetplay.__arcadeIsAdmin = Boolean(identity.chatTag);
                            activeNetplay.__arcadeAdminIdentityInstalled = true;
                            tagName();
                            return true;
                        };
                        const adminIdentityTimer = window.setInterval(() => {
                            installAdminIdentity().then((installed) => {
                                if (installed) window.clearInterval(adminIdentityTimer);
                            });
                        }, 250);
                        installAdminIdentity();
                        window.setTimeout(() => window.clearInterval(adminIdentityTimer), 15000);
                        if (netplay && !netplay.__arcadeJoinCodeHooked) {
                            const addJoinCodeButton = () => {
                                const menuBody = netplay._menuElement?.querySelector(".ejs_popup_body") || netplay._menuElement;
                                if (!menuBody || menuBody.querySelector(".arcade-join-code-button")) return;

                                const joinCodeButton = document.createElement("button");
                                joinCodeButton.type = "button";
                                joinCodeButton.className = "ejs_button_button arcade-join-code-button";
                                joinCodeButton.textContent = "Join by Code";
                                joinCodeButton.style.margin = "10px auto";
                                joinCodeButton.style.display = "block";
                                menuBody.prepend(joinCodeButton);

                                joinCodeButton.addEventListener("click", () => {
                                    const popups = netplay.emu.createSubPopup();
                                    netplay._menuElement.appendChild(popups[0]);
                                    const popup = popups[1];
                                    popup.classList.add("ejs_cheat_parent");
                                    const title = document.createElement("h2");
                                    title.className = "ejs_netplay_name_heading";
                                    title.textContent = "Join by Code";
                                    popup.appendChild(title);
                                    const form = document.createElement("div");
                                    form.className = "ejs_netplay_header";
                                    const codeInput = document.createElement("input");
                                    codeInput.type = "text";
                                    codeInput.maxLength = 100;
                                    codeInput.placeholder = "Paste the host code";
                                    const passwordInput = document.createElement("input");
                                    passwordInput.type = "password";
                                    passwordInput.maxLength = 100;
                                    passwordInput.placeholder = "Password (optional)";
                                    form.append("Join Code", document.createElement("br"), codeInput, "Password (optional)", document.createElement("br"), passwordInput);
                                    popup.appendChild(form);
                                    const actions = document.createElement("div");
                                    actions.className = "ejs_netplay_dialog_buttons";
                                    const joinButton = document.createElement("button");
                                    joinButton.className = "ejs_button_button ejs_popup_submit";
                                    joinButton.textContent = "Join";
                                    const cancelButton = document.createElement("button");
                                    cancelButton.className = "ejs_button_button ejs_popup_submit";
                                    cancelButton.textContent = "Cancel";
                                    actions.append(joinButton, cancelButton);
                                    popup.appendChild(actions);
                                    const close = () => popups[0].remove();
                                    cancelButton.addEventListener("click", close);
                                    joinButton.addEventListener("click", () => {
                                        const code = codeInput.value.trim();
                                        if (!code) return;
                                        close();
                                        netplay.joinRoom(code, "Netplay Room", 4, passwordInput.value.trim() || null);
                                    });
                                    codeInput.addEventListener("keydown", (event) => {
                                        if (event.key === "Enter") joinButton.click();
                                        if (event.key === "Escape") close();
                                    });
                                    setTimeout(() => codeInput.focus(), 0);
                                });
                            };
                            const originalCreateNetplayMenu = netplay.createNetplayMenu.bind(netplay);
                            netplay.createNetplayMenu = function() {
                                originalCreateNetplayMenu();
                                addJoinCodeButton();
                            };
                            netplay.__arcadeJoinCodeHooked = true;
                            addJoinCodeButton();
                            const joinCodeTimer = window.setInterval(addJoinCodeButton, 100);
                            window.setTimeout(() => window.clearInterval(joinCodeTimer), 15000);
                        }
                        if (netplay && !netplay.__arcadeRoomCodeHooked) {
                            const originalRoomJoined = netplay.roomJoined.bind(netplay);
                            netplay.roomJoined = function(isOwner, roomName, password, roomId) {
                                window.parent.postMessage({ type: "NETPLAY_ROOM_READY", roomCode: roomId, roomName }, "*");
                                const result = originalRoomJoined(isOwner, roomName, password, roomId);
                                const joinedSection = netplay._joinedDiv;
                                if (joinedSection && !joinedSection.querySelector(".arcade-room-code")) {
                                    const code = document.createElement("div");
                                    code.className = "arcade-room-code";
                                    code.textContent = "Join code: " + roomId;
                                    code.style.margin = "10px 0";
                                    code.style.padding = "8px 12px";
                                    code.style.color = "#fff";
                                    code.style.background = "rgba(0, 229, 255, 0.2)";
                                    code.style.border = "1px solid rgba(0, 229, 255, 0.6)";
                                    code.style.borderRadius = "4px";
                                    code.style.textAlign = "center";
                                    joinedSection.insertBefore(code, joinedSection.firstChild);
                                }
                                return result;
                            };
                            netplay.__arcadeRoomCodeHooked = true;
                        }
                        if (pendingNetplay) {
                            delete window.parent.__arcadePendingNetplay;
                            const startPendingNetplay = () => {
                                const pendingEmulatorNetplay = window.EJS_emulator && window.EJS_emulator.netplay;
                                if (!pendingEmulatorNetplay) return;
                                const pendingPlayerName = pendingNetplay.playerName || "Player";
                                pendingEmulatorNetplay.name = window.parent.__arcadeAdmin?.isAdmin
                                    ? "[ADMIN] " + pendingPlayerName
                                    : pendingPlayerName;
                                if (pendingNetplay.mode === "join") {
                                    pendingEmulatorNetplay.joinRoom(pendingNetplay.roomCode, pendingNetplay.roomName, 4, pendingNetplay.password || null);
                                } else {
                                    pendingEmulatorNetplay.openRoom(pendingNetplay.roomName, 4, pendingNetplay.password || "");
                                }
                            };
                            setTimeout(startPendingNetplay, 0);
                        }
                        
                        const base64DataPacket = "${embeddedBase64State}";
                        if (base64DataPacket && window.EJS_emulator) {
                            try {
                                const rawArrayBytes = Uint8Array.from(atob(base64DataPacket), char => char.charCodeAt(0));
                                window.EJS_emulator.loadState(rawArrayBytes);
                                console.log("Progress restored natively via local IndexedDB storage!");
                            } catch(restoreErr) { console.error("Restore intercept exception:", restoreErr); }
                        }
                    };

                    window.addEventListener("message", function(event) {
                        if (event.data === "EXECUTE_ARCADE_SAVE_SEQUENCE") {
                            if (window.EJS_emulator && typeof window.EJS_emulator.saveState === "function") {
                                try {
                                    const rawMemoryDump = window.EJS_emulator.saveState();
                                    const binaryDataArray = new Uint8Array(rawMemoryDump);
                                    
                                    window.parent.postMessage({
                                        type: "SAVE_DATA_PAYLOAD",
                                        token: "${gameToken}",
                                        bytes: binaryDataArray
                                    }, "*");
                                } catch(saveErr) { 
                                    console.error("Save snapshot creation crash:", saveErr); 
                                    window.parent.postMessage("SAVE_FAILED", "*");
                                }
                            } else {
                                window.parent.postMessage("SAVE_SKIPPED", "*");
                            }
                        }
                    });
                </script>
                <script>
                    (() => {
                        let accountUser = null;
                        try { accountUser = JSON.parse(parent.localStorage.getItem("arcadeAuthUser") || "null"); } catch {}
                        const username = String(accountUser?.username || "Player").trim() || "Player";
                        const installUsername = () => {
                            const activeNetplay = window.EJS_emulator?.netplay;
                            if (!activeNetplay || activeNetplay.__arcadeUsernameGuardInstalled) return Boolean(activeNetplay?.__arcadeUsernameGuardInstalled);
                            let chatTag = "";
                            const setUsername = () => {
                                const cleanName = String(username).replace(/^(?:\[[^\]]+\]\s*)+/i, "");
                                activeNetplay.name = chatTag ? chatTag + " " + cleanName : cleanName || "Player";
                            };
                            setUsername();
                            const originalOpenMenu = activeNetplay.openMenu;
                            if (typeof originalOpenMenu === "function") {
                                activeNetplay.openMenu = function(...args) {
                                    setUsername();
                                    return originalOpenMenu.apply(this, args);
                                };
                            }
                            activeNetplay.__arcadeUsernameGuardInstalled = true;
                            fetch("${projectRootUrl}chat-identities.json", { cache: "no-store" })
                                .then((response) => response.json())
                                .then((data) => {
                                    const identity = (data.users || []).find((entry) => String(entry.username || "").toLowerCase() === username.toLowerCase());
                                    chatTag = String(identity?.chatTag || "").trim();
                                    setUsername();
                                })
                                .catch(() => {});
                            return true;
                        };
                        const usernameGuardTimer = window.setInterval(() => {
                            if (installUsername()) window.clearInterval(usernameGuardTimer);
                        }, 25);
                        window.setTimeout(() => window.clearInterval(usernameGuardTimer), 30000);
                    })();
                </script>
                <script>
                    try {
                        const savedSettingsKey = "ejs-${gameId}-${game.core}-${String(game.title || "")}-settings";
                        const savedSettings = JSON.parse(localStorage.getItem(savedSettingsKey) || "null");
                        if (savedSettings && Array.isArray(savedSettings.cheats)) {
                            savedSettings.cheats = [];
                            localStorage.setItem(savedSettingsKey, JSON.stringify(savedSettings));
                        }
                    } catch {}
                </script>
                <script src="${projectRootUrl}emulatorjs/data/loader.js"></script>
                <script>
                    const installArcadeCheats = () => {
                        const emulator = window.EJS_emulator;
                        const pendingCheats = window.__arcadePendingCheats;
                        if (!emulator || !emulator.started || !emulator.gameManager || !Array.isArray(pendingCheats) || emulator.__arcadeCheatsInstalled) return Boolean(emulator?.__arcadeCheatsInstalled);
                        emulator.gameManager.resetCheat();
                        emulator.cheats.length = 0;
                        emulator.cheats.push(...pendingCheats.map(([desc, code]) => ({ desc, checked: false, code, is_permanent: true })));
                        emulator.cheats.forEach((cheat) => { cheat.checked = false; });
                        emulator.__arcadeCheatsInstalled = true;
                        const cheatRows = emulator.elements?.cheatRows;
                        if (cheatRows) {
                            pendingCheats.forEach(([desc, code], index) => {
                                const row = document.createElement("div");
                                row.className = "ejs_cheat_row";
                                const input = document.createElement("input");
                                input.type = "checkbox";
                                input.id = "arcade_cheat_" + index;
                                const label = document.createElement("label");
                                label.htmlFor = input.id;
                                label.textContent = desc;
                                input.addEventListener("change", () => {
                                    emulator.gameManager.setCheat(index, input.checked, code);
                                    emulator.cheats[index].checked = input.checked;
                                    emulator.saveSettings();
                                });
                                row.append(input, label);
                                cheatRows.appendChild(row);
                            });
                        }
                        emulator.saveSettings();
                        return true;
                    };
                    const arcadeCheatTimer = window.setInterval(() => {
                        if (installArcadeCheats()) window.clearInterval(arcadeCheatTimer);
                    }, 50);
                    window.setTimeout(() => window.clearInterval(arcadeCheatTimer), 30000);
                </script>
                <script>
                    (async () => {
                        let accountUser;
                        try { accountUser = JSON.parse(parent.localStorage.getItem("arcadeAuthUser") || "null"); } catch { return; }
                        if (!accountUser?.username) return;
                        try {
                            const response = await fetch("${projectRootUrl}admins.json", { cache: "no-store" });
                            const admins = (await response.json()).admins || [];
                            if (!admins.some((admin) => String(admin.username || "").toLowerCase() === String(accountUser.username).toLowerCase())) return;
                        } catch { return; }
                        const normalizeAdminChat = () => document.querySelectorAll(".ejs_netplay_chat_log > div").forEach((line) => {
                            const cleanText = String(line.textContent || "").replace(/^(?:\[ADMIN\]\s*)+/i, "");
                            const sender = cleanText.split(/\s*(?::| \(private\):)/, 1)[0].trim();
                            const names = [accountUser.username, accountUser.name].filter(Boolean).map((name) => String(name).toLowerCase());
                            if (names.includes(sender.toLowerCase())) line.textContent = "[ADMIN] " + cleanText;
                        });
                        new MutationObserver(normalizeAdminChat).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
                        normalizeAdminChat();
                    })();
                </script>
            </body>
            </html>
        `;
    }

    window.removeEventListener("message", handleIncomingParentMessages);
    window.addEventListener("message", handleIncomingParentMessages);

    iframe.src = "about:blank";
    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(sandboxedHTML);
    frameDoc.close();
}

async function handleIncomingParentMessages(event) {
    if (event.data === "EMULATOR_STATE_READY") {
        emulatorReady = true;
    }
    if (event.data && event.data.type === "SAVE_DATA_PAYLOAD") {
        try {
            const dbInstance = await openArcadeIndexedDB();
            const transaction = dbInstance.transaction("game_save_states", "readwrite");
            const store = transaction.objectStore("game_save_states");
            
            // Put the clean, raw binary array directly into the database, clearing all limits
            store.put(event.data.bytes, event.data.token);
            
            transaction.oncomplete = () => {
                console.log("✅ State data successfully written locally into Infinite IndexedDB!");
                window.removeEventListener("message", handleIncomingParentMessages);
                finalizeArcadeClosure();
            };
        } catch (dbWriteErr) {
            console.error("Database write exception:", dbWriteErr);
            finalizeArcadeClosure();
        }
    }
    if (event.data === "SAVE_FAILED" || event.data === "SAVE_SKIPPED") {
        window.removeEventListener("message", handleIncomingParentMessages);
        finalizeArcadeClosure();
    }
}

function finalizeArcadeClosure() {
    const iframe = document.getElementById('emu-sandbox-frame');
    const emuOverlay = document.getElementById('emu-overlay');
    if (!iframe || !emuOverlay) return;

    iframe.src = "about:blank"; 
    emuOverlay.style.display = "none";
    window.__arcadeActiveRuntimeGame = null;
    window.dispatchEvent(new CustomEvent('arcade-session-state-changed', { detail: { game: null } }));
    
    window.EJS_player = null;
    window.EJS_gameUrl = null;
}

function closeGameWithSave(game, hintsDisplay) {
    const iframe = document.getElementById('emu-sandbox-frame');
    const emuOverlay = document.getElementById('emu-overlay');
    if (!iframe || !emuOverlay) return;

    if (hintsDisplay) hintsDisplay.textContent = "Extracting local memory states... Please wait.";

    if (game && game.core !== "ruffle" && game.core !== "native_html" && iframe.contentWindow && emulatorReady) {
        iframe.contentWindow.postMessage("EXECUTE_ARCADE_SAVE_SEQUENCE", "*");
    } else {
        finalizeArcadeClosure();
        if (hintsDisplay) hintsDisplay.textContent = "Session terminated.";
    }
}
