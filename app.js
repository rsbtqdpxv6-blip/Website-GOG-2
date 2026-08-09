// ==============================================================================
//                    UNIFIED APPLICATION CONTROLLER (PART 1)
// ==============================================================================
(() => { 
    let gameLibrary = [];
    let currentSystemIdx = 0;
    let currentGameIdx = 0;
    let currentViewMode = "WHEEL"; 

    const theta = 35; 
    const radius = 380; 
    const flatCardSpacing = 340; 

    // --- TRUE NATIVE OFFLINE WAV FILE PATHWAYS RE-ENGAGED ---
    const soundScroll = new Audio('assets/sound/scroll.wav');
    const soundSelect = new Audio('assets/sound/select.wav');
    const soundLaunch = new Audio('assets/sound/launch.wav');
    const soundBack   = new Audio('assets/sound/back.wav');

    // --- THE CHROMIUM HARDWARE AUDIO LOCK BYPASS ENGINE ---
    let audioContextUnlocked = false;

    function playArcadeSound(audioObject) {
        if (!audioObject) return;
        
        if (!audioContextUnlocked) {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    const ctx = new AudioContextClass();
                    
                    if (ctx.state === 'suspended') {
                        ctx.resume();
                    }
                    
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.001, ctx.currentTime); 
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(0);
                    osc.stop(0.01); 
                    
                    audioContextUnlocked = true;
                    console.log("🔊 HARDWARE SYSTEM AUDIO JACK SECURELY ENGAGED!");
                }
            } catch (ctxErr) {
                console.warn("Hardware audio initializer bypassed:", ctxErr);
            }
        }

        try {
            audioObject.pause();
            audioObject.currentTime = 0; 
            
            let playPromise = audioObject.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name !== "AbortError") {
                        console.warn("Speaker track blocked by hardware layer restriction:", error);
                    }
                });
            }
        } catch (soundError) {
            console.warn("Audio Context native playback exception:", soundError);
        }
    }

    // DOM Interface Element Hooks
    const wheelStage = document.getElementById('wheel-stage');
    const gamelistView = document.getElementById('gamelist-view');
    const carousel = document.getElementById('carousel-view');
    const titlesColumn = document.getElementById('game-titles-column');
    const systemDisplay = document.getElementById('system-display');
    const counterDisplay = document.getElementById('counter-display');
    const hintsDisplay = document.getElementById('control-hints');
    const gameTitleElement = document.getElementById('game-title');
    const gameBoxartElement = document.getElementById('game-boxart');
    const emuOverlay = document.getElementById('emu-overlay');
    const exitGameBtn = document.getElementById('exit-game-btn');
    const entryScreen = document.getElementById('entry-screen');
    const entryScreenBtn = document.getElementById('enter-site-btn');
    const entryUpdateList = document.getElementById('entry-update-list');
    const controllerSettingsBtn = document.getElementById('controller-settings-btn');
    const runtimeControllerSettingsBtn = document.getElementById('runtime-controller-settings-btn');
    const controllerBindingsOverlay = document.getElementById('controller-bindings-overlay');
    const controllerBindingsCloseBtn = document.getElementById('controller-bindings-close');
    const controllerBindingsResetBtn = document.getElementById('controller-bindings-reset');
    const controllerBindingsList = document.getElementById('controller-bindings-list');
    const controllerStatusEl = document.getElementById('controller-status');
    const flashBindingsOverlay = document.getElementById('flash-bindings-overlay');
    const flashBindingsCloseBtn = document.getElementById('flash-bindings-close');
    const flashBindingsAddBtn = document.getElementById('flash-bindings-add');
    const flashBindingsExportBtn = document.getElementById('flash-bindings-export');
    const flashBindingsList = document.getElementById('flash-bindings-list');

    let controllerPollFrame = null;
    let lastControllerActionTime = 0;
    const controllerActionCooldownMs = 220;
    let lastControllerButtonState = {
        a: false,
        b: false,
        x: false,
        lb: false,
        rb: false
    };
    let lastPressedControllerButtons = [];
    let controllerBindingCapture = null;
    let controllerProfile = 'auto';
    let flashBindingCaptureIndex = null;
    let flashKeyBindings = [
        { key: 'ArrowLeft', action: 'previous', label: 'D-pad Left' },
        { key: 'ArrowRight', action: 'next', label: 'D-pad Right' },
        { key: 'ArrowUp', action: 'up', label: 'D-pad Up' },
        { key: 'ArrowDown', action: 'down', label: 'D-pad Down' },
        { key: 'Enter', action: 'select', label: 'A / Select' },
        { key: 'Backspace', action: 'back', label: 'B / Back' },
        { key: 'x', action: 'random', label: 'X / Random' }
    ];

    const defaultControllerBindings = {
        left: { action: 'previous', button: 14, label: 'D-pad Left' },
        right: { action: 'next', button: 15, label: 'D-pad Right' },
        up: { action: 'up', button: 12, label: 'D-pad Up' },
        down: { action: 'down', button: 13, label: 'D-pad Down' },
        select: { action: 'select', button: 0, label: 'A / South' },
        back: { action: 'back', button: 1, label: 'B / East' },
        random: { action: 'random', button: 2, label: 'X / West' },
        pagePrev: { action: 'previous', button: 4, label: 'L1 / LB' },
        pageNext: { action: 'next', button: 5, label: 'R1 / RB' }
    };
    let controllerBindings = {
        left: { ...defaultControllerBindings.left },
        right: { ...defaultControllerBindings.right },
        up: { ...defaultControllerBindings.up },
        down: { ...defaultControllerBindings.down },
        select: { ...defaultControllerBindings.select },
        back: { ...defaultControllerBindings.back },
        random: { ...defaultControllerBindings.random },
        pagePrev: { ...defaultControllerBindings.pagePrev },
        pageNext: { ...defaultControllerBindings.pageNext }
    };

    function getControllerProfile(pad) {
        const id = (pad?.id || '').toLowerCase();
        if (!id) return 'generic';
        if (id.includes('xbox') || id.includes('xinput')) return 'xbox';
        if (id.includes('playstation') || id.includes('ps') || id.includes('dualshock') || id.includes('dualsense')) return 'playstation';
        if (id.includes('switch') || id.includes('pro controller')) return 'switch';
        return 'generic';
    }

    function getBindingDefaultsForProfile(profile) {
        if (profile === 'xbox') {
            return {
                left: { action: 'previous', button: 14, label: 'D-pad Left' },
                right: { action: 'next', button: 15, label: 'D-pad Right' },
                up: { action: 'up', button: 12, label: 'D-pad Up' },
                down: { action: 'down', button: 13, label: 'D-pad Down' },
                select: { action: 'select', button: 0, label: 'A' },
                back: { action: 'back', button: 1, label: 'B' },
                random: { action: 'random', button: 2, label: 'X' },
                pagePrev: { action: 'previous', button: 4, label: 'LB' },
                pageNext: { action: 'next', button: 5, label: 'RB' }
            };
        }

        if (profile === 'playstation' || profile === 'switch') {
            return {
                left: { action: 'previous', button: 14, label: 'D-pad Left' },
                right: { action: 'next', button: 15, label: 'D-pad Right' },
                up: { action: 'up', button: 12, label: 'D-pad Up' },
                down: { action: 'down', button: 13, label: 'D-pad Down' },
                select: { action: 'select', button: 0, label: 'Cross / A' },
                back: { action: 'back', button: 1, label: 'Circle / B' },
                random: { action: 'random', button: 3, label: 'Triangle / Y' },
                pagePrev: { action: 'previous', button: 4, label: 'L1' },
                pageNext: { action: 'next', button: 5, label: 'R1' }
            };
        }

        return {
            left: { action: 'previous', button: 14, label: 'D-pad Left' },
            right: { action: 'next', button: 15, label: 'D-pad Right' },
            up: { action: 'up', button: 12, label: 'D-pad Up' },
            down: { action: 'down', button: 13, label: 'D-pad Down' },
            select: { action: 'select', button: 0, label: 'A / South' },
            back: { action: 'back', button: 1, label: 'B / East' },
            random: { action: 'random', button: 2, label: 'X / West' },
            pagePrev: { action: 'previous', button: 4, label: 'L1 / LB' },
            pageNext: { action: 'next', button: 5, label: 'R1 / RB' }
        };
    }

    function applyBindingsFromProfile(profile) {
        const defaults = getBindingDefaultsForProfile(profile);
        Object.keys(defaults).forEach((bindingKey) => {
            if (!controllerBindings[bindingKey] || controllerBindings[bindingKey].isCustom) {
                controllerBindings[bindingKey] = { ...defaults[bindingKey], isCustom: false };
            }
        });
        updateBindingsUI();
        if (controllerStatusEl) {
            controllerStatusEl.textContent = `${profile === 'auto' ? 'Connected' : profile.toUpperCase()} controller ready`; 
        }
    }

    function getButtonLabel(buttonIndex, profile) {
        const labelLookup = {
            xbox: {
                0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 12: 'D-pad Up', 13: 'D-pad Down', 14: 'D-pad Left', 15: 'D-pad Right'
            },
            playstation: {
                0: 'Cross', 1: 'Circle', 2: 'Square', 3: 'Triangle', 4: 'L1', 5: 'R1', 12: 'D-pad Up', 13: 'D-pad Down', 14: 'D-pad Left', 15: 'D-pad Right'
            },
            switch: {
                0: 'B', 1: 'A', 2: 'Y', 3: 'X', 4: 'L', 5: 'R', 12: 'D-pad Up', 13: 'D-pad Down', 14: 'D-pad Left', 15: 'D-pad Right'
            },
            generic: {
                0: 'Button 0', 1: 'Button 1', 2: 'Button 2', 3: 'Button 3', 4: 'Button 4', 5: 'Button 5', 12: 'D-pad Up', 13: 'D-pad Down', 14: 'D-pad Left', 15: 'D-pad Right'
            }
        };
        return labelLookup[profile]?.[buttonIndex] || labelLookup.generic[buttonIndex] || `Button ${buttonIndex}`;
    }

    function normalizeFlashKeyLabel(value) {
        if (!value) return 'Unassigned';
        if (value === ' ') return 'Space';
        if (value.length === 1) return value.toUpperCase();
        return value;
    }

    function getFlashBindingActionLabel(action) {
        const actionLabels = {
            previous: 'D-pad Left',
            next: 'D-pad Right',
            up: 'D-pad Up',
            down: 'D-pad Down',
            select: 'A / Select',
            back: 'B / Back',
            random: 'X / Random',
            pagePrev: 'LB / Page Back',
            pageNext: 'RB / Page Forward'
        };
        return actionLabels[action] || action;
    }

    function getFlashBindingKeyName(eventLike) {
        if (!eventLike) return '';
        const rawKey = typeof eventLike === 'string' ? eventLike : (eventLike.key || eventLike.code || '');
        if (!rawKey) return '';
        if (rawKey === ' ') return 'Space';
        if (rawKey.length === 1) return rawKey.toLowerCase();
        return rawKey;
    }

    function loadFlashKeyBindings() {
        try {
            const saved = localStorage.getItem('flash-runtime-keybindings');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    flashKeyBindings = parsed;
                }
            }
        } catch (error) {
            console.warn('Unable to load flash keybindings:', error);
        }
    }

    function persistFlashKeyBindings() {
        try {
            localStorage.setItem('flash-runtime-keybindings', JSON.stringify(flashKeyBindings));
        } catch (error) {
            console.warn('Unable to save flash keybindings:', error);
        }
    }

    function exportFlashKeyBindings() {
        const payload = JSON.stringify(flashKeyBindings, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'flash-keybindings.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function renderFlashBindingsUI() {
        if (!flashBindingsList) return;

        flashBindingsList.innerHTML = flashKeyBindings.map((mapping, index) => {
            const currentKey = normalizeFlashKeyLabel(mapping.key);
            const waitingClass = flashBindingCaptureIndex === index ? ' is-waiting' : '';
            return `
                <div class="flash-binding-row">
                    <div class="flash-binding-meta">
                        <span class="flash-binding-title">${getFlashBindingActionLabel(mapping.action)}</span>
                        <span class="flash-binding-key">${currentKey}</span>
                    </div>
                    <div class="flash-binding-controls">
                        <button class="flash-binding-key-btn${waitingClass}" data-flash-index="${index}" type="button">${flashBindingCaptureIndex === index ? 'Press a key' : 'Set key'}</button>
                        <select class="flash-binding-action-select" data-flash-index="${index}">
                            <option value="previous" ${mapping.action === 'previous' ? 'selected' : ''}>D-pad Left</option>
                            <option value="next" ${mapping.action === 'next' ? 'selected' : ''}>D-pad Right</option>
                            <option value="up" ${mapping.action === 'up' ? 'selected' : ''}>D-pad Up</option>
                            <option value="down" ${mapping.action === 'down' ? 'selected' : ''}>D-pad Down</option>
                            <option value="select" ${mapping.action === 'select' ? 'selected' : ''}>A / Select</option>
                            <option value="back" ${mapping.action === 'back' ? 'selected' : ''}>B / Back</option>
                            <option value="random" ${mapping.action === 'random' ? 'selected' : ''}>X / Random</option>
                            <option value="pagePrev" ${mapping.action === 'pagePrev' ? 'selected' : ''}>LB / Page Back</option>
                            <option value="pageNext" ${mapping.action === 'pageNext' ? 'selected' : ''}>RB / Page Forward</option>
                        </select>
                        <button class="flash-binding-remove-btn" data-flash-index="${index}" type="button">Remove</button>
                    </div>
                </div>
            `;
        }).join('');

        flashBindingsList.querySelectorAll('.flash-binding-key-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                flashBindingCaptureIndex = Number(btn.dataset.flashIndex);
                renderFlashBindingsUI();
            });
        });

        flashBindingsList.querySelectorAll('.flash-binding-action-select').forEach((select) => {
            select.addEventListener('change', (event) => {
                const index = Number(select.dataset.flashIndex);
                flashKeyBindings[index] = { ...flashKeyBindings[index], action: event.target.value };
                persistFlashKeyBindings();
                renderFlashBindingsUI();
            });
        });

        flashBindingsList.querySelectorAll('.flash-binding-remove-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const index = Number(btn.dataset.flashIndex);
                flashKeyBindings.splice(index, 1);
                if (flashBindingCaptureIndex === index) {
                    flashBindingCaptureIndex = null;
                } else if (flashBindingCaptureIndex > index) {
                    flashBindingCaptureIndex -= 1;
                }
                persistFlashKeyBindings();
                renderFlashBindingsUI();
            });
        });
    }

    function addFlashBindingRow() {
        flashKeyBindings.push({ key: '', action: 'select', label: 'New Mapping' });
        persistFlashKeyBindings();
        renderFlashBindingsUI();
        flashBindingCaptureIndex = flashKeyBindings.length - 1;
        renderFlashBindingsUI();
    }

    function openFlashBindingsPanel() {
        if (flashBindingsOverlay) {
            flashBindingsOverlay.hidden = false;
            renderFlashBindingsUI();
        }
    }

    function closeFlashBindingsPanel() {
        if (flashBindingsOverlay) {
            flashBindingsOverlay.hidden = true;
            flashBindingCaptureIndex = null;
            renderFlashBindingsUI();
        }
    }

    function isFlashRuntimeActive() {
        return !!(emuOverlay && emuOverlay.style.display === 'block' && window.__arcadeActiveRuntimeGame && (
            window.__arcadeActiveRuntimeGame.core === 'ruffle' ||
            (window.__arcadeActiveRuntimeGame.rom_path || '').toLowerCase().endsWith('.swf')
        ));
    }

    function handleFlashRuntimeKeyInput(event) {
        if (!isFlashRuntimeActive()) return false;

        const incomingKey = getFlashBindingKeyName(event);
        const match = flashKeyBindings.find((mapping) => {
            if (!mapping.key) return false;
            const storedKey = getFlashBindingKeyName(mapping.key).toLowerCase();
            return storedKey === incomingKey.toLowerCase();
        });

        if (!match) return false;

        event.preventDefault();
        dispatchInputAction(match.action);
        return true;
    }

    function updateBindingsUI() {
        if (!controllerBindingsList) return;

        const rows = [
            { key: 'left', label: 'Scroll Left / Previous' },
            { key: 'right', label: 'Scroll Right / Next' },
            { key: 'up', label: 'Move Up' },
            { key: 'down', label: 'Move Down' },
            { key: 'select', label: 'Select / Launch' },
            { key: 'back', label: 'Back' },
            { key: 'random', label: 'Random Pick' },
            { key: 'pagePrev', label: 'Page Back' },
            { key: 'pageNext', label: 'Page Forward' }
        ];

        controllerBindingsList.innerHTML = rows.map(({ key, label }) => {
            const binding = controllerBindings[key];
            const buttonLabel = binding?.label || getButtonLabel(binding?.button ?? 0, controllerProfile);
            const waitingClass = controllerBindingCapture === key ? ' is-waiting' : '';
            const promptLabel = controllerBindingCapture === key ? 'Select a Keybind' : buttonLabel;
            return `
                <div class="binding-row">
                    <span>${label}</span>
                    <button class="binding-chip${waitingClass}" data-binding-key="${key}" type="button">${promptLabel}</button>
                </div>
            `;
        }).join('');

        controllerBindingsList.querySelectorAll('.binding-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                controllerBindingCapture = chip.dataset.bindingKey;
                updateBindingsUI();
            });
        });
    }

    function assignBinding(bindingKey, buttonIndex, label) {
        controllerBindings[bindingKey] = { action: controllerBindings[bindingKey]?.action || 'select', button: buttonIndex, label, isCustom: true };
        controllerBindingCapture = null;
        updateBindingsUI();
    }

    function resetControllerBindings() {
        controllerBindings = {
            left: { ...defaultControllerBindings.left },
            right: { ...defaultControllerBindings.right },
            up: { ...defaultControllerBindings.up },
            down: { ...defaultControllerBindings.down },
            select: { ...defaultControllerBindings.select },
            back: { ...defaultControllerBindings.back },
            random: { ...defaultControllerBindings.random },
            pagePrev: { ...defaultControllerBindings.pagePrev },
            pageNext: { ...defaultControllerBindings.pageNext }
        };
        controllerBindingCapture = null;
        updateBindingsUI();
    }

    function triggerControllerAction() {
        const now = performance.now();
        if (now - lastControllerActionTime < controllerActionCooldownMs) {
            return false;
        }
        lastControllerActionTime = now;
        return true;
    }

    function dispatchInputAction(action) {
        if (!triggerControllerAction()) return;

        if (currentViewMode === "WHEEL") {
            switch (action) {
                case "next":
                    if (currentSystemIdx < gameLibrary.length - 1) updateWheelSelection(currentSystemIdx + 1, true);
                    break;
                case "previous":
                    if (currentSystemIdx > 0) updateWheelSelection(currentSystemIdx - 1, true);
                    break;
                case "select":
                    enterGamelist();
                    break;
                case "random":
                    if (gameLibrary.length > 1) {
                        let randomSystemIdx;
                        do {
                            randomSystemIdx = Math.floor(Math.random() * gameLibrary.length);
                        } while (randomSystemIdx === currentSystemIdx);

                        updateWheelSelection(randomSystemIdx, true);
                        console.log("🎲 Attract Mode System Selection: " + randomSystemIdx);
                    }
                    break;
            }
        } else if (currentViewMode === "GAMELIST") {
            const totalGames = gameLibrary[currentSystemIdx]?.games?.length || 0;
            if (totalGames === 0) {
                if (action === "back") setViewMode("WHEEL");
                return;
            }

            switch (action) {
                case "down":
                    if (currentGameIdx < totalGames - 1) updateGameSelection(currentGameIdx + 1, true);
                    else updateGameSelection(0, true);
                    break;
                case "up":
                    if (currentGameIdx > 0) updateGameSelection(currentGameIdx - 1, true);
                    else updateGameSelection(totalGames - 1, true);
                    break;
                case "next":
                    updateGameSelection(Math.min(currentGameIdx + 10, totalGames - 1), true);
                    break;
                case "previous":
                    updateGameSelection(Math.max(currentGameIdx - 10, 0), true);
                    break;
                case "select": {
                    const selectedGame = gameLibrary[currentSystemIdx]?.games?.[currentGameIdx];
                    if (!selectedGame) return;

                    playArcadeSound(soundLaunch);
                    if (selectedGame.core === "native_html") {
                        launchHtmlGame(selectedGame, hintsDisplay);
                    } else {
                        launchGame(selectedGame, hintsDisplay);
                    }
                    break;
                }
                case "back":
                    playArcadeSound(soundBack);
                    setViewMode("WHEEL");
                    break;
                case "random":
                    if (totalGames > 1) {
                        let randomGameIdx;
                        do {
                            randomGameIdx = Math.floor(Math.random() * totalGames);
                        } while (randomGameIdx === currentGameIdx);

                        updateGameSelection(randomGameIdx, true);
                        console.log("🎲 Attract Mode Game Selection: " + randomGameIdx);
                    }
                    break;
            }
        }
    }

    function startControllerPolling() {
        if (controllerPollFrame !== null) return;
        controllerPollFrame = requestAnimationFrame(pollControllerInput);
    }

    function pollControllerInput() {
        controllerPollFrame = requestAnimationFrame(pollControllerInput);

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = Array.from(gamepads).find((candidate) => candidate && candidate.connected);
        if (!pad) {
            if (controllerProfile !== 'none') {
                controllerProfile = 'none';
                if (controllerStatusEl) controllerStatusEl.textContent = 'No controller detected';
            }
            return;
        }

        controllerProfile = getControllerProfile(pad);
        if (controllerStatusEl) {
            controllerStatusEl.textContent = `${pad.id || 'Controller'} connected`;
        }

        const buttons = pad.buttons || [];
        const axes = pad.axes || [];
        const currentPressedButtons = buttons.reduce((acc, button, index) => {
            if (button?.pressed) acc.push(index);
            return acc;
        }, []);

        if (controllerBindingCapture) {
            const newlyPressed = currentPressedButtons.filter((index) => !lastPressedControllerButtons.includes(index));
            if (newlyPressed.length > 0) {
                const targetButton = newlyPressed[0];
                const profileUsed = controllerProfile === 'generic' ? 'generic' : controllerProfile;
                assignBinding(controllerBindingCapture, targetButton, getButtonLabel(targetButton, profileUsed));
                controllerBindingCapture = null;
            }
        }

        const emuOverlayActive = !!(emuOverlay && emuOverlay.style.display === "block");
        const bindingsMenuVisible = !!(controllerBindingsOverlay && !controllerBindingsOverlay.hidden);
        if (emuOverlayActive && !bindingsMenuVisible && !controllerBindingCapture) {
            lastControllerButtonState = {
                a: false,
                b: false,
                x: false,
                lb: false,
                rb: false
            };
            lastPressedControllerButtons = currentPressedButtons;
            return;
        }

        const stickX = axes[0] ?? 0;
        const stickY = axes[1] ?? 0;
        const horizontalInput = (controllerBindings.right?.button !== undefined && buttons[controllerBindings.right.button]?.pressed ? 1 : 0) - (controllerBindings.left?.button !== undefined && buttons[controllerBindings.left.button]?.pressed ? 1 : 0);
        const verticalInput = (controllerBindings.down?.button !== undefined && buttons[controllerBindings.down.button]?.pressed ? 1 : 0) - (controllerBindings.up?.button !== undefined && buttons[controllerBindings.up.button]?.pressed ? 1 : 0);
        const analogHorizontalInput = (stickX > 0.5 ? 1 : 0) - (stickX < -0.5 ? 1 : 0);
        const analogVerticalInput = (stickY > 0.5 ? 1 : 0) - (stickY < -0.5 ? 1 : 0);

        const resolvedHorizontalInput = horizontalInput || analogHorizontalInput;
        const resolvedVerticalInput = verticalInput || analogVerticalInput;

        if (resolvedHorizontalInput > 0) {
            dispatchInputAction(controllerBindings.right?.action || 'next');
        } else if (resolvedHorizontalInput < 0) {
            dispatchInputAction(controllerBindings.left?.action || 'previous');
        }

        if (resolvedVerticalInput > 0) {
            dispatchInputAction(controllerBindings.down?.action || 'down');
        } else if (resolvedVerticalInput < 0) {
            dispatchInputAction(controllerBindings.up?.action || 'up');
        }

        const aPressed = buttons[controllerBindings.select?.button]?.pressed || buttons[9]?.pressed || false;
        const bPressed = buttons[controllerBindings.back?.button]?.pressed || buttons[8]?.pressed || false;
        const xPressed = buttons[controllerBindings.random?.button]?.pressed || false;
        const lbPressed = buttons[controllerBindings.pagePrev?.button]?.pressed || false;
        const rbPressed = buttons[controllerBindings.pageNext?.button]?.pressed || false;

        if (aPressed && !lastControllerButtonState.a) {
            dispatchInputAction("select");
        }
        if (bPressed && !lastControllerButtonState.b) {
            dispatchInputAction("back");
        }
        if (xPressed && !lastControllerButtonState.x) {
            dispatchInputAction("random");
        }
        if (lbPressed && !lastControllerButtonState.lb) {
            dispatchInputAction("previous");
        }
        if (rbPressed && !lastControllerButtonState.rb) {
            dispatchInputAction("next");
        }

        lastControllerButtonState = {
            a: aPressed,
            b: bPressed,
            x: xPressed,
            lb: lbPressed,
            rb: rbPressed
        };
        lastPressedControllerButtons = currentPressedButtons;
    }

    async function loadLibrary() {
        try {
            const response = await fetch('library.json');
            gameLibrary = await response.json();
            
            if (gameLibrary.length > 0) {
                renderWheel();
                updateWheelSelection(0, false); 
                setViewMode("WHEEL");
            }
        } catch (error) {
            if (hintsDisplay) hintsDisplay.textContent = "Error parsing default library data models.";
        }
    }

    function renderWheel() {
        if (!carousel) return;
        carousel.innerHTML = '';
        gameLibrary.forEach((sys, idx) => {
            const card = document.createElement('div');
            card.className = `carousel-card`;
            card.innerHTML = `
                <div class="icon-wrapper">
                    <img src="assets/icons/${sys.system}.png" alt="Icon" onerror="this.src='assets/icons/default_system.png'">
                </div>
                <div class="card-title">${sys.title}</div>
            `;
            card.addEventListener('click', () => {
                if (currentViewMode !== "WHEEL") return;
                if (idx === currentSystemIdx) enterGamelist(); else updateWheelSelection(idx, true);
            });
            carousel.appendChild(card);
        });
    }

    function updateWheelSelection(index, triggerSound = true) {
        const cards = document.querySelectorAll('.carousel-card');
        if (cards.length === 0) return;

        cards[currentSystemIdx].classList.remove('active');
        currentSystemIdx = index;
        cards[currentSystemIdx].classList.add('active');

        if (triggerSound) playArcadeSound(soundScroll); 

        cards.forEach((card, idx) => {
            const indexOffset = idx - currentSystemIdx;
            const angleOffset = indexOffset * theta;
            const horizontalShift = indexOffset * flatCardSpacing;

            if (idx === currentSystemIdx) {
                card.style.transform = `translateX(0px) rotateY(0deg) translateZ(${radius}px) scale(1.05)`;
                card.style.opacity = "1";
            } else {
                card.style.transform = `translateX(${horizontalShift}px) rotateY(${angleOffset}deg) translateZ(${radius}px)`;
                const distance = Math.abs(indexOffset);
                card.style.opacity = distance > 2 ? "0" : `${0.45 / distance}`;
            }
        });

        const data = gameLibrary[currentSystemIdx];
        if (systemDisplay) systemDisplay.textContent = data.title.toUpperCase();
        if (counterDisplay) counterDisplay.textContent = `${currentSystemIdx + 1} / ${gameLibrary.length}`;
        if (hintsDisplay) hintsDisplay.textContent = " -- MADE BY WESLEY ◄ ► Select System • [R] Random System • Enter to Open Menu • Gamepad Ready";
        document.body.style.setProperty('--system-bg', `url('assets/backgrounds/${data.system}.jpg')`);
    }
    // ==============================================================================
    //                    UNIFIED APPLICATION CONTROLLER (PART 2)
    // ==============================================================================
    function enterGamelist() {
        playArcadeSound(soundSelect); 
        refreshGamelistUI();
        setViewMode("GAMELIST");
        updateGameSelection(0, false); 
    }

    function refreshGamelistUI() {
        const currentSystem = gameLibrary[currentSystemIdx];
        if (!titlesColumn) return;
        titlesColumn.innerHTML = '';
        
        const previewPane = document.querySelector('.preview-pane');
        if (previewPane) {
            previewPane.classList.remove('nes-box-override'); 
        }

        if (!currentSystem.games || currentSystem.games.length === 0) {
            titlesColumn.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No default games found.</div>';
            return;
        }

        currentSystem.games.forEach((game, idx) => {
            const row = document.createElement('div');
            row.className = "game-row-item";
            row.textContent = game.title || "Unknown Title Asset"; 
            row.addEventListener('click', () => { if (currentViewMode === "GAMELIST") updateGameSelection(idx, true); });
            titlesColumn.appendChild(row);
        });
    }

    function updateGameSelection(index, triggerSound = true) {
        if (!gameLibrary || !gameLibrary[currentSystemIdx]) return;
        const currentSystem = gameLibrary[currentSystemIdx];
        if (!currentSystem.games || currentSystem.games.length === 0) return;

        const rows = document.querySelectorAll('.game-row-item');
        if (rows.length === 0) return;

        if (rows[currentGameIdx]) {
            rows[currentGameIdx].classList.remove('focused-game');
        }
        
        currentGameIdx = index;
        
        if (rows[currentGameIdx]) {
            rows[currentGameIdx].classList.add('focused-game');
            rows[currentGameIdx].scrollIntoView({ block: 'nearest' });
        }

        if (triggerSound) playArcadeSound(soundScroll); 

        const targetGame = currentSystem.games[currentGameIdx];
        if (!targetGame) return; 

        if (gameTitleElement) {
            gameTitleElement.textContent = targetGame.title || "Untitled Classic";
        }
        
        if (gameBoxartElement) {
            gameBoxartElement.onerror = null; 
            gameBoxartElement.onerror = function() {
                this.onerror = null; 
                this.src = "assets/icons/default_boxart.png"; 
            };
            gameBoxartElement.src = targetGame.boxart || "assets/icons/default_boxart.png";
        }

        const fanartBox = document.getElementById('game-fanart-box');
        if (fanartBox) {
            if (targetGame.fanart) {
                fanartBox.style.setProperty('--game-fanart', `url('${targetGame.fanart}')`);
            } else {
                fanartBox.style.setProperty('--game-fanart', 'none');
            }
        }

        if (systemDisplay) systemDisplay.textContent = currentSystem.title.toUpperCase() + " / GAMES";
        if (counterDisplay) counterDisplay.textContent = `${currentGameIdx + 1} / ${currentSystem.games.length}`;
        if (hintsDisplay) hintsDisplay.textContent = "▲ ▼ Scroll • ◄ ► Page Jump (+/- 10) • [R] Random Game • Enter to Start • Backspace to Go Back • Gamepad Ready";
    }

    function setViewMode(mode) {
        currentViewMode = mode;
        if (mode === "WHEEL") {
            if (gamelistView) gamelistView.classList.remove('active-view');
            if (wheelStage) wheelStage.classList.add('active-view');
            updateWheelSelection(currentSystemIdx, false);
        } else if (mode === "GAMELIST") {
            if (wheelStage) wheelStage.classList.remove('active-view');
            if (gamelistView) gamelistView.classList.add('active-view');
        }
    }

    if (exitGameBtn) {
        exitGameBtn.onclick = () => {
            const currentSystem = gameLibrary[currentSystemIdx];
            const targetGame = currentSystem.games[currentGameIdx];
            playArcadeSound(soundBack);

            if (targetGame && targetGame.core === "native_html") {
                closeHtmlGame(hintsDisplay);
            } else {
                closeGameWithSave(targetGame, hintsDisplay);
            }
        };
    }

    window.addEventListener('keydown', (e) => {
        if (controllerBindingCapture) {
            e.preventDefault();
            return;
        }

        if (flashBindingCaptureIndex !== null) {
            e.preventDefault();
            if (e.key === 'Escape') {
                flashBindingCaptureIndex = null;
                renderFlashBindingsUI();
                return;
            }
            const targetIndex = flashBindingCaptureIndex;
            flashKeyBindings[targetIndex] = { ...flashKeyBindings[targetIndex], key: getFlashBindingKeyName(e), label: normalizeFlashKeyLabel(getFlashBindingKeyName(e)) };
            flashBindingCaptureIndex = null;
            persistFlashKeyBindings();
            renderFlashBindingsUI();
            return;
        }

        if (flashBindingsOverlay && !flashBindingsOverlay.hidden) {
            e.preventDefault();
            return;
        }

        forceHardwareAudioWake();

        if (emuOverlay && emuOverlay.style.display === "block") {
            if (handleFlashRuntimeKeyInput(e)) return;
            return;
        } 
        
        const keyLower = e.key.toLowerCase();

        if (currentViewMode === "WHEEL") {
            if (e.key === 'ArrowRight' || keyLower === 'd') {
                e.preventDefault();
                dispatchInputAction("next");
            } else if (e.key === 'ArrowLeft' || keyLower === 'a') {
                e.preventDefault();
                dispatchInputAction("previous");
            } else if (e.key === 'Enter') {
                e.preventDefault();
                dispatchInputAction("select");
            } else if (keyLower === 'r') {
                e.preventDefault();
                dispatchInputAction("random");
            }
        } else if (currentViewMode === "GAMELIST") {
            if (e.key === 'ArrowDown' || keyLower === 's') {
                e.preventDefault();
                dispatchInputAction("down");
            } else if (e.key === 'ArrowUp' || keyLower === 'w') {
                e.preventDefault();
                dispatchInputAction("up");
            } else if (e.key === 'ArrowRight' || keyLower === 'd') {
                e.preventDefault();
                dispatchInputAction("next");
            } else if (e.key === 'ArrowLeft' || keyLower === 'a') {
                e.preventDefault();
                dispatchInputAction("previous");
            } else if (keyLower === 'r') {
                e.preventDefault();
                dispatchInputAction("random");
            } else if (e.key === 'Enter') {
                e.preventDefault();
                dispatchInputAction("select");
            } else if (e.key === 'Backspace' || e.key === 'Escape') {
                e.preventDefault();
                dispatchInputAction("back");
            }
        }
    });

    function forceHardwareAudioWake() {
        console.log("⚡ User Input Caught! Priming audio channels completely offline...");
        
        [soundScroll, soundSelect, soundLaunch, soundBack].forEach(track => {
            if (track) track.load(); 
        });
        
        playArcadeSound(soundScroll);
    }

    async function loadEntryUpdates() {
        if (!entryUpdateList) return;
        try {
            const response = await fetch('update-log.json');
            const data = await response.json();
            const updates = Array.isArray(data?.updates) ? data.updates : [];
            entryUpdateList.innerHTML = updates.map((item) => `
                <div class="entry-update-item">
                    <strong>${item.version || 'Update'} — ${item.title || 'Latest update'}</strong>
                    <span>${item.detail || ''}</span>
                </div>
            `).join('');
        } catch (error) {
            entryUpdateList.innerHTML = '<div class="entry-update-item"><strong>No update log available</strong><span>Check back later for notes.</span></div>';
        }
    }

    function enterSite() {
        if (entryScreen) entryScreen.hidden = true;
        document.body.classList.add('app-ready');
        handleUserInteraction();
    }

    function handleUserInteraction() {
        forceHardwareAudioWake();
        startControllerPolling();
    }

    function openControllerBindingsPanel() {
        if (controllerBindingsOverlay) {
            controllerBindingsOverlay.hidden = false;
            updateBindingsUI();
        }
    }

    if (entryScreenBtn) {
        entryScreenBtn.addEventListener('click', () => {
            enterSite();
        });
    }

    if (controllerSettingsBtn) {
        controllerSettingsBtn.addEventListener('click', () => {
            openControllerBindingsPanel();
        });
    }

    if (runtimeControllerSettingsBtn) {
        runtimeControllerSettingsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openFlashBindingsPanel();
        });
    }

    if (flashBindingsCloseBtn) {
        flashBindingsCloseBtn.addEventListener('click', () => {
            closeFlashBindingsPanel();
        });
    }

    if (flashBindingsAddBtn) {
        flashBindingsAddBtn.addEventListener('click', () => {
            addFlashBindingRow();
        });
    }

    if (flashBindingsExportBtn) {
        flashBindingsExportBtn.addEventListener('click', () => {
            exportFlashKeyBindings();
        });
    }

    if (flashBindingsOverlay) {
        flashBindingsOverlay.addEventListener('click', (event) => {
            if (event.target === flashBindingsOverlay) {
                closeFlashBindingsPanel();
            }
        });
    }

    if (controllerBindingsCloseBtn) {
        controllerBindingsCloseBtn.addEventListener('click', () => {
            if (controllerBindingsOverlay) {
                controllerBindingsOverlay.hidden = true;
                controllerBindingCapture = null;
                updateBindingsUI();
            }
        });
    }

    if (controllerBindingsResetBtn) {
        controllerBindingsResetBtn.addEventListener('click', () => {
            resetControllerBindings();
        });
    }

    if (controllerBindingsOverlay) {
        controllerBindingsOverlay.addEventListener('click', (event) => {
            if (event.target === controllerBindingsOverlay) {
                controllerBindingsOverlay.hidden = true;
                controllerBindingCapture = null;
                updateBindingsUI();
            }
        });
    }

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('gamepadconnected', () => {
        handleUserInteraction();
        if (controllerBindingsOverlay && !controllerBindingsOverlay.hidden) {
            updateBindingsUI();
        }
    });

    loadEntryUpdates();
    loadFlashKeyBindings();
    loadLibrary();
    updateBindingsUI();
    renderFlashBindingsUI();
})();
