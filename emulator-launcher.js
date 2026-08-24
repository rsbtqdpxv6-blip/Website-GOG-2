

let emulatorReady = false;

/**
 * Strips a local ROM path down to a clean alphanumeric identifier token.
 */
function getCleanGameToken(romPath) {
    return romPath.split('/').pop().split('.').shift().toLowerCase().replace(/[^a-z0-9]/g, "_");
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
                    window.EJS_pathtodata = "${projectRootUrl}emulatorjs/data/"; 
                    window.EJS_language = "en-US";
                    window.EJS_startOnLoaded = true;
                    window.EJS_threads = ${threadedCoresEnabled};
                    window.EJS_cacheConfig = {
                        enabled: true,
                        cacheMaxSizeMB: 256,   // Lower memory usage from the previous 4 GB default
                        cacheMaxAgeMins: 120   // Keep cache data shorter-lived to reduce footprint
                    };
                    ${dosExecutableMapping}

                    window.EJS_onLoad = function() {
                        window.parent.postMessage("EMULATOR_STATE_READY", "*");
                        
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
                <script src="${projectRootUrl}emulatorjs/data/loader.js"></script>
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
