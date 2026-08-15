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
    let audioPrimed = false;

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
    const settingsBtn = document.getElementById('settings-menu-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close');
    const threadedCoresSwitch = document.getElementById('settings-threaded-cores');
    const flashBindingsOverlay = document.getElementById('flash-bindings-overlay');
    const flashBindingsCloseBtn = document.getElementById('flash-bindings-close');
    const flashBindingsAddBtn = document.getElementById('flash-bindings-add');
    const flashBindingsExportBtn = document.getElementById('flash-bindings-export');
    const flashBindingsList = document.getElementById('flash-bindings-list');
    const previewPane = document.querySelector('.preview-pane');
    const fanartBox = document.getElementById('game-fanart-box');
    const crtOverlay = document.getElementById('crt-overlay');
    const crtEnabledSwitch = document.getElementById('settings-crt-enabled');
    const crtCanvas = document.getElementById('crt-distortion-canvas');
    let crtCanvasCtx = crtCanvas ? crtCanvas.getContext('2d') : null;
    let crtAnimationFrame = null;

    let controllerPollFrame = null;
    let carouselCards = [];
    let gameRowItems = [];
    let gamelistFolderStack = []; // stack of folder path segments for drill-down
    let displayedGamelistItems = []; // current visible items (folders + games)
    let appActivated = false;
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
    let secretSystemUnlocked = false;
    const SETTINGS_KEY = 'arcadeSettings';
    let arcadeSettings = { threadedCores: false, crtEnabled: false };

    function loadArcadeSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            arcadeSettings = {
                threadedCores: saved.threadedCores === true,
                crtEnabled: saved.crtEnabled === true
            };
        } catch {
            arcadeSettings = { threadedCores: false, crtEnabled: false };
        }
        window.__arcadeEmulatorSettings = { ...arcadeSettings };
    }

    function persistArcadeSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(arcadeSettings));
        window.__arcadeEmulatorSettings = { ...arcadeSettings };
    }

    function resizeCrtCanvas() {
        if (!crtCanvas) return;
        const ratio = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.floor(window.innerWidth * ratio));
        const height = Math.max(1, Math.floor(window.innerHeight * ratio));

        if (crtCanvas.width !== width || crtCanvas.height !== height) {
            crtCanvas.width = width;
            crtCanvas.height = height;
            crtCanvas.style.width = `${window.innerWidth}px`;
            crtCanvas.style.height = `${window.innerHeight}px`;
            crtCanvasCtx = crtCanvas.getContext('2d');
        }
    }

    function renderCrtDistortion() {
        if (!crtCanvasCtx || !arcadeSettings.crtEnabled) return;

        const w = crtCanvas.width;
        const h = crtCanvas.height;
        const t = performance.now() * 0.001;

        crtCanvasCtx.clearRect(0, 0, w, h);
        crtCanvasCtx.save();

        crtCanvasCtx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        crtCanvasCtx.fillRect(0, 0, w, h);

        const scanlineHeight = Math.max(1, Math.round(2 * (window.devicePixelRatio || 1)));
        crtCanvasCtx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let y = 0; y < h; y += scanlineHeight * 2) {
            crtCanvasCtx.fillRect(0, y, w, scanlineHeight);
        }

        for (let i = 0; i < 140; i += 1) {
            const x = (i * 97.31) % w;
            const y = ((i * 53.17) + (t * 120)) % h;
            const grain = 0.06 + (i % 6) * 0.01;
            crtCanvasCtx.fillStyle = `rgba(180, 200, 255, ${grain})`;
            crtCanvasCtx.fillRect(x, y, 2 + (i % 4), 1 + (i % 3));
        }

        const warpStrength = 8;
        crtCanvasCtx.strokeStyle = 'rgba(255,255,255,0.08)';
        crtCanvasCtx.lineWidth = 1;
        crtCanvasCtx.beginPath();
        for (let x = 0; x <= w; x += 28) {
            const offset = Math.sin((x / w) * Math.PI * 6 + t * 1.6) * warpStrength;
            crtCanvasCtx.moveTo(x, 0);
            crtCanvasCtx.lineTo(x + offset, h);
        }
        crtCanvasCtx.stroke();

        crtCanvasCtx.restore();
        crtAnimationFrame = requestAnimationFrame(renderCrtDistortion);
    }

    function updateCrtOverlayState() {
        if (!crtOverlay) return;
        resizeCrtCanvas();

        if (arcadeSettings.crtEnabled) {
            crtOverlay.classList.add('active');
            if (!crtAnimationFrame) {
                crtAnimationFrame = requestAnimationFrame(renderCrtDistortion);
            }
        } else {
            crtOverlay.classList.remove('active');
            if (crtAnimationFrame) {
                cancelAnimationFrame(crtAnimationFrame);
                crtAnimationFrame = null;
            }
            if (crtCanvasCtx && crtCanvas) {
                crtCanvasCtx.clearRect(0, 0, crtCanvas.width, crtCanvas.height);
            }
        }
    }

    function applySettingsToUI() {
        if (threadedCoresSwitch) {
            threadedCoresSwitch.checked = !!arcadeSettings.threadedCores;
        }
        if (crtEnabledSwitch) {
            crtEnabledSwitch.checked = !!arcadeSettings.crtEnabled;
        }
    }

    function openSettingsPanel() {
        if (!settingsOverlay) return;
        settingsOverlay.hidden = false;
        applySettingsToUI();
    }

    function closeSettingsPanel() {
        if (!settingsOverlay) return;
        settingsOverlay.hidden = true;
    }
    let secretUnlockProgress = 0;
    const secretUnlockSequence = ['w', 'e', 's'];

    function getVisibleSystemIndices() {
        return gameLibrary.reduce((indices, system, idx) => {
            if (system.system !== 'secret' || secretSystemUnlocked) {
                indices.push(idx);
            }
            return indices;
        }, []);
    }

    function getFirstVisibleSystemIndex() {
        const visible = getVisibleSystemIndices();
        return visible.length ? visible[0] : 0;
    }

    function getVisibleSystemPosition(actualIndex) {
        return getVisibleSystemIndices().indexOf(actualIndex);
    }

    function revealSecretSystem() {
        if (secretSystemUnlocked) return;
        const secretIndex = gameLibrary.findIndex((system) => system.system === 'secret');
        if (secretIndex === -1) return;

        secretSystemUnlocked = true;
        secretUnlockProgress = 0;
        renderWheel();
        updateWheelSelection(secretIndex, true);

        if (hintsDisplay) {
            hintsDisplay.textContent = 'Secret system unlocked! Navigate to it and press Enter.';
        }
    }

    function handleSecretUnlockKey(rawKey) {
        if (secretSystemUnlocked || currentViewMode !== 'WHEEL') return;
        const keyLower = (rawKey || '').toLowerCase();
        if (keyLower === secretUnlockSequence[secretUnlockProgress]) {
            secretUnlockProgress += 1;
            if (secretUnlockProgress === secretUnlockSequence.length) {
                revealSecretSystem();
            }
        } else {
            secretUnlockProgress = keyLower === secretUnlockSequence[0] ? 1 : 0;
        }
    }

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

    const controllerBindingRows = [
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

    const wheelKeyMap = {
        ArrowRight: 'next',
        ArrowLeft: 'previous',
        Enter: 'select',
        r: 'random',
        d: 'next',
        a: 'previous'
    };

    const gamelistKeyMap = {
        ArrowDown: 'down',
        ArrowUp: 'up',
        ArrowRight: 'next',
        ArrowLeft: 'previous',
        Enter: 'select',
        Backspace: 'back',
        Escape: 'back',
        s: 'down',
        w: 'up',
        d: 'next',
        a: 'previous',
        r: 'random'
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
            const actionValue = mapping.action || 'select';
            return `
                <div class="flash-binding-row">
                    <div class="flash-binding-meta">
                        <span class="flash-binding-title">${getFlashBindingActionLabel(actionValue)}</span>
                        <span class="flash-binding-key">${currentKey}</span>
                    </div>
                    <div class="flash-binding-controls">
                        <button class="flash-binding-key-btn${waitingClass}" data-flash-index="${index}" type="button">${flashBindingCaptureIndex === index ? 'Press a key' : 'Set key'}</button>
                        <select class="flash-binding-action-select" data-flash-index="${index}">
                            <option value="previous" ${actionValue === 'previous' ? 'selected' : ''}>D-pad Left</option>
                            <option value="next" ${actionValue === 'next' ? 'selected' : ''}>D-pad Right</option>
                            <option value="up" ${actionValue === 'up' ? 'selected' : ''}>D-pad Up</option>
                            <option value="down" ${actionValue === 'down' ? 'selected' : ''}>D-pad Down</option>
                            <option value="select" ${actionValue === 'select' ? 'selected' : ''}>A / Select</option>
                            <option value="back" ${actionValue === 'back' ? 'selected' : ''}>B / Back</option>
                            <option value="random" ${actionValue === 'random' ? 'selected' : ''}>X / Random</option>
                            <option value="pagePrev" ${actionValue === 'pagePrev' ? 'selected' : ''}>LB / Page Back</option>
                            <option value="pageNext" ${actionValue === 'pageNext' ? 'selected' : ''}>RB / Page Forward</option>
                        </select>
                        <button class="flash-binding-remove-btn" data-flash-index="${index}" type="button">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function handleFlashBindingsListInteraction(event) {
        if (!flashBindingsList) return;

        const button = event.target.closest('button');
        const select = event.target.closest('.flash-binding-action-select');

        if (button && flashBindingsList.contains(button)) {
            const index = Number(button.dataset.flashIndex);
            if (button.classList.contains('flash-binding-key-btn')) {
                flashBindingCaptureIndex = index;
                renderFlashBindingsUI();
                return;
            }

            if (button.classList.contains('flash-binding-remove-btn')) {
                flashKeyBindings.splice(index, 1);
                if (flashBindingCaptureIndex === index) {
                    flashBindingCaptureIndex = null;
                } else if (flashBindingCaptureIndex > index) {
                    flashBindingCaptureIndex -= 1;
                }
                persistFlashKeyBindings();
                renderFlashBindingsUI();
                return;
            }
        }

        if (select && flashBindingsList.contains(select)) {
            const index = Number(select.dataset.flashIndex);
            flashKeyBindings[index] = { ...flashKeyBindings[index], action: select.value };
            persistFlashKeyBindings();
            renderFlashBindingsUI();
        }
    }

    function addFlashBindingRow() {
        flashKeyBindings.push({ key: '', action: 'select', label: 'New Mapping' });
        flashBindingCaptureIndex = flashKeyBindings.length - 1;
        persistFlashKeyBindings();
        renderFlashBindingsUI();
    }

    function openFlashBindingsPanel() {
        if (!isFlashRuntimeActive()) return;
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

    function syncRuntimeButtonVisibility() {
        if (!runtimeControllerSettingsBtn) return;
        const flashActive = isFlashRuntimeActive();
        runtimeControllerSettingsBtn.hidden = !flashActive;
        if (!flashActive && flashBindingsOverlay && !flashBindingsOverlay.hidden) {
            closeFlashBindingsPanel();
        }
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
    }

    function handleControllerBindingsClick(event) {
        const button = event.target.closest('.binding-chip');
        if (!button || !controllerBindingsList || !controllerBindingsList.contains(button)) return;
        controllerBindingCapture = button.dataset.bindingKey;
        updateBindingsUI();
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
            const visibleIndices = getVisibleSystemIndices();
            const currentVisiblePosition = visibleIndices.indexOf(currentSystemIdx);
            switch (action) {
                case "next":
                    if (currentVisiblePosition < visibleIndices.length - 1) {
                        updateWheelSelection(visibleIndices[currentVisiblePosition + 1], true);
                    }
                    break;
                case "previous":
                    if (currentVisiblePosition > 0) {
                        updateWheelSelection(visibleIndices[currentVisiblePosition - 1], true);
                    }
                    break;
                case "select":
                    enterGamelist();
                    break;
                case "random":
                    if (visibleIndices.length > 1) {
                        let randomVisiblePosition;
                        do {
                            randomVisiblePosition = Math.floor(Math.random() * visibleIndices.length);
                        } while (visibleIndices[randomVisiblePosition] === currentSystemIdx);

                        updateWheelSelection(visibleIndices[randomVisiblePosition], true);
                        console.log("🎲 Attract Mode System Selection: " + randomVisiblePosition);
                    }
                    break;
            }
        } else if (currentViewMode === "GAMELIST") {
            const totalGames = displayedGamelistItems.length || 0;
            if (totalGames === 0) {
                if (action === "back") setViewMode("WHEEL");
                return;
            }

            switch (action) {
                case "down":
                    if (currentGameIdx < totalGames - 1) updateGameSelection(currentGameIdx + 1, true, false);
                    else updateGameSelection(0, true, false);
                    break;
                case "up":
                    if (currentGameIdx > 0) updateGameSelection(currentGameIdx - 1, true, false);
                    else updateGameSelection(totalGames - 1, true, false);
                    break;
                case "next":
                    updateGameSelection(Math.min(currentGameIdx + 10, totalGames - 1), true, false);
                    break;
                case "previous":
                    updateGameSelection(Math.max(currentGameIdx - 10, 0), true, false);
                    break;
                case "select": {
                    const item = displayedGamelistItems[currentGameIdx];
                    if (!item) return;

                    if (item.type === 'folder') {
                        gamelistFolderStack.push(item.name);
                        refreshGamelistUI();
                        updateGameSelection(0, false);
                        return;
                    }

                    const selectedGame = item.game || gameLibrary[currentSystemIdx]?.games?.[item.origIndex];
                    if (!selectedGame) return;

                    playArcadeSound(soundLaunch);
                    if (selectedGame.core === "native_html") {
                        launchHtmlGame(selectedGame, hintsDisplay);
                    } else {
                        launchGame(selectedGame, hintsDisplay);
                    }
                    syncRuntimeButtonVisibility();
                    break;
                }
                case "back":
                    playArcadeSound(soundBack);
                    if (gamelistFolderStack.length > 0) {
                        // pop one level and focus first item without auto-entering folders
                        gamelistFolderStack.pop();
                        refreshGamelistUI();
                        updateGameSelection(0, false, false);
                    } else {
                        setViewMode("WHEEL");
                    }
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
                currentSystemIdx = getFirstVisibleSystemIndex();
                renderWheel();
                updateWheelSelection(currentSystemIdx, false);
                setViewMode("WHEEL");
            }
        } catch (error) {
            if (hintsDisplay) hintsDisplay.textContent = "Error parsing default library data models.";
        }
    }

    function renderWheel() {
        if (!carousel) return;
        carousel.innerHTML = '';
        carouselCards = [];

        const visibleIndices = getVisibleSystemIndices();
        visibleIndices.forEach((actualIndex, visibleIndex) => {
            const sys = gameLibrary[actualIndex];
            const card = document.createElement('div');
            card.className = `carousel-card`;
            card.innerHTML = `
                <div class="icon-wrapper">
                    <img src="assets/icons/${sys.system}.webp" alt="Icon" onerror="this.src='assets/icons/secret.webp'">
                </div>
                <div class="card-title">${sys.title}</div>
            `;
            card.dataset.systemIndex = actualIndex;
            card.addEventListener('click', () => {
                if (currentViewMode !== "WHEEL") return;
                if (actualIndex === currentSystemIdx) {
                    enterGamelist();
                } else {
                    updateWheelSelection(actualIndex, true);
                }
            });
            carousel.appendChild(card);
            carouselCards.push({ card, actualIndex, visibleIndex });
        });
    }

    function updateWheelSelection(index, triggerSound = true) {
        if (carouselCards.length === 0) return;
        if (currentSystemIdx !== null) {
            const previousCardObj = carouselCards.find((entry) => entry.actualIndex === currentSystemIdx);
            if (previousCardObj) previousCardObj.card.classList.remove('active');
        }

        currentSystemIdx = index;
        const visibleIndices = getVisibleSystemIndices();
        let selectedVisiblePosition = visibleIndices.indexOf(currentSystemIdx);
        if (selectedVisiblePosition === -1) {
            currentSystemIdx = visibleIndices[0] ?? currentSystemIdx;
            selectedVisiblePosition = 0;
        }
        const activeCardObj = carouselCards.find((entry) => entry.actualIndex === currentSystemIdx);
        if (activeCardObj) activeCardObj.card.classList.add('active');

        if (triggerSound) playArcadeSound(soundScroll);

        carouselCards.forEach((entry) => {
            const indexOffset = entry.visibleIndex - selectedVisiblePosition;
            const angleOffset = indexOffset * theta;
            const horizontalShift = indexOffset * flatCardSpacing;
            const depthOffset = Math.max(0, 2 - Math.abs(indexOffset)) * 90;
            const scaleValue = entry.visibleIndex === selectedVisiblePosition ? 1.08 : Math.max(0.86, 1 - Math.abs(indexOffset) * 0.05);

            if (entry.visibleIndex === selectedVisiblePosition) {
                entry.card.style.transform = `translate3d(0px, -10px, ${radius + 90}px) rotateY(0deg) scale(${scaleValue})`;
                entry.card.style.opacity = "1";
            } else {
                entry.card.style.transform = `translate3d(${horizontalShift}px, 0px, ${radius - depthOffset}px) rotateY(${angleOffset}deg) scale(${scaleValue})`;
                const distance = Math.abs(indexOffset);
                entry.card.style.opacity = distance > 2 ? "0" : `${0.42 + (0.12 - distance * 0.03)}`;
            }
        });

        const data = gameLibrary[currentSystemIdx];
        if (systemDisplay) systemDisplay.textContent = data.title.toUpperCase();
        if (counterDisplay) {
            const visibleCount = getVisibleSystemIndices().length;
            const visiblePosition = Math.max(0, selectedVisiblePosition) + 1;
            counterDisplay.textContent = `${visiblePosition} / ${visibleCount}`;
        }
        if (hintsDisplay) hintsDisplay.textContent = " -- MADE BY WESLEY ◄ ► Select System • [R] Random System • Enter to Open Menu • Gamepad Ready";
        document.body.style.setProperty('--system-bg', `url('assets/backgrounds/${data.system}.jpg')`);
    }
    // ==============================================================================
    //                    UNIFIED APPLICATION CONTROLLER (PART 2)
    // ==============================================================================
    function enterGamelist() {
        playArcadeSound(soundSelect);
        // reset folder drill state when opening gamelist from wheel
        gamelistFolderStack = [];
        refreshGamelistUI();
        setViewMode("GAMELIST");
        // highlight first item but do not auto-enter folders on initial open
        updateGameSelection(0, false, false);
    }

    function buildGamelistItems() {
        const items = [];
        const currentSystem = gameLibrary[currentSystemIdx];
        if (!currentSystem || !Array.isArray(currentSystem.games)) return items;

        currentSystem.games.forEach((game, origIndex) => {
            // Special-case: treat HTML5 games packaged as folder/index.html as single games
            try {
                if (currentSystem.system === 'html5') {
                    const rp = String(game.rom_path || '');
                    const m = rp.match(/assets\/roms\/html5\/([^\/]+)\/index\.html$/i);
                    if (m) {
                        const folderName = m[1];
                        items.push({ type: 'game', title: game.title || folderName, origIndex, game });
                        return;
                    }
                }
            } catch (e) { /* ignore */ }
            const parts = String(game.rom_path || '').split('/').filter(Boolean);
            const sysIndex = parts.indexOf(currentSystem.system);
            const relative = sysIndex >= 0 ? parts.slice(sysIndex + 1, -1) : [];

            // Only include games that live under the current stack path
            if (gamelistFolderStack.length > 0) {
                const relPath = relative.join('/');
                if (!relPath.startsWith(gamelistFolderStack.join('/'))) return;
            }

            if (relative.length === 0) {
                // game at root of system
                if (gamelistFolderStack.length === 0) items.push({ type: 'game', title: game.title || 'Untitled', origIndex, game });
            } else {
                const segIndex = gamelistFolderStack.length;
                if (segIndex >= relative.length) {
                    // this game is directly inside the current folder
                    items.push({ type: 'game', title: game.title || 'Untitled', origIndex, game });
                } else {
                    const nextSeg = relative[segIndex];
                    let folder = items.find(it => it.type === 'folder' && it.name === nextSeg);
                    if (!folder) {
                        folder = { type: 'folder', name: nextSeg, title: nextSeg, childrenCount: 0 };
                        items.push(folder);
                    }
                    folder.childrenCount += 1;
                }
            }
        });

        const folders = items.filter(i => i.type === 'folder').sort((a,b) => a.title.localeCompare(b.title, undefined, {sensitivity:'base'}));
        const games = items.filter(i => i.type === 'game').sort((a,b) => (a.title||'').localeCompare(b.title||'', undefined, {sensitivity:'base'}));
        const result = [...folders, ...games];
        try { console.debug('buildGamelistItems', currentSystem.system, result); } catch(e) {}
        return result;
    }

    function refreshGamelistUI() {
        const currentSystem = gameLibrary[currentSystemIdx];
        if (!titlesColumn) return;
        titlesColumn.innerHTML = '';
        gameRowItems = [];
        displayedGamelistItems = buildGamelistItems();

        if (previewPane) {
            previewPane.classList.remove('nes-box-override');
        }

        if (!displayedGamelistItems || displayedGamelistItems.length === 0) {
            titlesColumn.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No games found in this folder.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        displayedGamelistItems.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'game-row-item';
            if (item.type === 'folder') {
                row.innerHTML = `📁 ${item.title} <span style="float:right; opacity:0.6">${item.childrenCount || ''}</span>`;
                row.dataset.type = 'folder';
                row.dataset.folderName = item.name;
                row.classList.add('folder-item');
            } else {
                row.textContent = item.title || 'Untitled';
                row.dataset.type = 'game';
                row.dataset.gameIndex = item.origIndex;
            }
            row.dataset.index = idx;
            fragment.appendChild(row);
            gameRowItems.push(row);
        });
        titlesColumn.appendChild(fragment);
    }

    function handleGamelistClick(event) {
        const row = event.target.closest('.game-row-item');
        if (!row || !titlesColumn || !titlesColumn.contains(row)) return;
        const idx = Number(row.dataset.index);
        if (!Number.isInteger(idx) || currentViewMode !== 'GAMELIST') return;

        const item = displayedGamelistItems[idx];
        if (!item) return;
        if (item.type === 'folder') {
            gamelistFolderStack.push(item.name);
            refreshGamelistUI();
            updateGameSelection(0, false);
            return;
        }

        updateGameSelection(idx, true);
    }

    function updateGameSelection(index, triggerSound = true, allowFolderEnter = true) {
        if (!gameLibrary || !gameLibrary[currentSystemIdx]) return;
        const currentSystem = gameLibrary[currentSystemIdx];
        if (!displayedGamelistItems || displayedGamelistItems.length === 0) return;

        if (gameRowItems.length === 0) return;

        if (gameRowItems[currentGameIdx]) {
            gameRowItems[currentGameIdx].classList.remove('focused-game');
        }

        currentGameIdx = index;

        if (gameRowItems[currentGameIdx]) {
            gameRowItems[currentGameIdx].classList.add('focused-game');
            gameRowItems[currentGameIdx].scrollIntoView({ block: 'nearest' });
        }

        if (triggerSound) playArcadeSound(soundScroll);

        const item = displayedGamelistItems[currentGameIdx];
        if (!item) return;

        if (item.type === 'folder') {
            if (!allowFolderEnter) {
                // folder is focused but we won't drill in automatically
                return;
            }
            // Enter folder on selection
            gamelistFolderStack.push(item.name);
            refreshGamelistUI();
            updateGameSelection(0, false);
            return;
        }

        const targetGame = item.game || currentSystem.games[item.origIndex];
        if (!targetGame) return;

        if (gameTitleElement) {
            gameTitleElement.textContent = targetGame.title || 'Untitled Classic';
        }

        if (gameBoxartElement) {
            gameBoxartElement.onerror = null;
            gameBoxartElement.onerror = function() {
                this.onerror = null;
                this.src = 'assets/icons/default_boxart.svg';
            };
            gameBoxartElement.src = targetGame.boxart || 'assets/icons/default_boxart.svg';
        }

        if (fanartBox) {
            if (targetGame.fanart) {
                fanartBox.style.setProperty('--game-fanart', `url('${targetGame.fanart}')`);
            } else {
                fanartBox.style.setProperty('--game-fanart', 'none');
            }
        }

        if (systemDisplay) systemDisplay.textContent = currentSystem.title.toUpperCase() + ' / GAMES';
        if (counterDisplay) counterDisplay.textContent = `${currentGameIdx + 1} / ${displayedGamelistItems.length}`;
        if (hintsDisplay) hintsDisplay.textContent = '▲ ▼ Scroll • ◄ ► Page Jump (+/- 10) • [R] Random Game • Enter to Start • Backspace to Go Back • Gamepad Ready';
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
            const activeGame = window.__arcadeActiveRuntimeGame || null;
            playArcadeSound(soundBack);

            if (activeGame) {
                if (activeGame.core === "native_html") {
                    closeHtmlGame(hintsDisplay);
                } else {
                    closeGameWithSave(activeGame, hintsDisplay);
                }
            } else {
                // fallback: try to resolve from current selection
                const currentSystem = gameLibrary[currentSystemIdx];
                const selectedItem = displayedGamelistItems[currentGameIdx];
                const targetGame = selectedItem?.type === 'game' ? (selectedItem.game || currentSystem.games[selectedItem.origIndex]) : null;
                if (targetGame && targetGame.core === "native_html") {
                    closeHtmlGame(hintsDisplay);
                } else if (targetGame) {
                    closeGameWithSave(targetGame, hintsDisplay);
                } else {
                    finalizeArcadeClosure();
                }
            }
            syncRuntimeButtonVisibility();
        };
    }

    window.addEventListener('keydown', (e) => {
        handleUserInteraction();
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
            const keyName = getFlashBindingKeyName(e);
            flashKeyBindings[targetIndex] = { ...flashKeyBindings[targetIndex], key: keyName, label: normalizeFlashKeyLabel(keyName) };
            flashBindingCaptureIndex = null;
            persistFlashKeyBindings();
            renderFlashBindingsUI();
            return;
        }

        if (flashBindingsOverlay && !flashBindingsOverlay.hidden) {
            e.preventDefault();
            return;
        }

        if (emuOverlay && emuOverlay.style.display === "block") {
            if (handleFlashRuntimeKeyInput(e)) return;
            return;
        }

        forceHardwareAudioWake();

        const rawKey = e.key;
        handleSecretUnlockKey(rawKey);
        const keyLower = rawKey.toLowerCase();
        const action = currentViewMode === "WHEEL"
            ? (wheelKeyMap[rawKey] || wheelKeyMap[keyLower])
            : (gamelistKeyMap[rawKey] || gamelistKeyMap[keyLower]);

        if (action) {
            e.preventDefault();
            dispatchInputAction(action);
        }
    });

    function forceHardwareAudioWake() {
        if (!audioPrimed) {
            [soundScroll, soundSelect, soundLaunch, soundBack].forEach(track => track?.load());
            audioPrimed = true;
        }
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
        if (appActivated) return;
        appActivated = true;
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

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openSettingsPanel();
        });
    }

    if (runtimeControllerSettingsBtn) {
        runtimeControllerSettingsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openFlashBindingsPanel();
        });
    }

    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', () => {
            closeSettingsPanel();
        });
    }

    if (threadedCoresSwitch) {
        threadedCoresSwitch.addEventListener('change', (event) => {
            arcadeSettings.threadedCores = event.target.checked;
            persistArcadeSettings();
        });
    }

    if (crtEnabledSwitch) {
        crtEnabledSwitch.addEventListener('change', (event) => {
            arcadeSettings.crtEnabled = event.target.checked;
            persistArcadeSettings();
            updateCrtOverlayState();
        });
    }

    window.addEventListener('resize', () => {
        if (arcadeSettings.crtEnabled) {
            resizeCrtCanvas();
        }
    });

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

    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', (event) => {
            if (event.target === settingsOverlay) {
                closeSettingsPanel();
            }
        });
    }

    if (flashBindingsList) {
        flashBindingsList.addEventListener('click', handleFlashBindingsListInteraction);
        flashBindingsList.addEventListener('change', handleFlashBindingsListInteraction);
    }

    if (controllerBindingsList) {
        controllerBindingsList.addEventListener('click', handleControllerBindingsClick);
    }

    if (titlesColumn) {
        titlesColumn.addEventListener('click', handleGamelistClick);
    }

    // Backup / Restore UI hooks
    const backupBtn = document.getElementById('backup-btn');
    const restoreBtn = document.getElementById('restore-btn');
    const backupFileInput = document.getElementById('backup-file-input');

    function reqToPromise(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function collectIndexedDB() {
        const result = [];
        if (!('indexedDB' in window)) return result;
        let dbInfos = [];
        if (indexedDB.databases) {
            try { dbInfos = await indexedDB.databases(); } catch (e) { dbInfos = []; }
        }
        // If databases() not available, we can't enumerate — return empty and rely on localStorage backup
        for (const info of dbInfos) {
            if (!info.name) continue;
            try {
                const openReq = indexedDB.open(info.name);
                const db = await new Promise((resolve, reject) => {
                    openReq.onsuccess = () => resolve(openReq.result);
                    openReq.onerror = () => reject(openReq.error);
                });
                const stores = Array.from(db.objectStoreNames);
                const storeData = {};
                for (const storeName of stores) {
                    try {
                        const tx = db.transaction(storeName, 'readonly');
                        const store = tx.objectStore(storeName);
                        const allReq = store.getAll();
                        const keysReq = store.getAllKeys();
                        const values = await reqToPromise(allReq);
                        const keys = await reqToPromise(keysReq);
                        storeData[storeName] = { keys, values };
                    } catch (e) {
                        // skip store on error
                    }
                }
                db.close();
                result.push({ name: info.name, version: info.version || 1, stores: storeData });
            } catch (e) {
                // skip db if can't open
            }
        }
        return result;
    }

    async function exportBackup() {
        try {
            if (hintsDisplay) hintsDisplay.textContent = 'Preparing backup...';
            const payload = { meta: { exportedAt: new Date().toISOString(), origin: location.hostname }, localStorage: {}, indexedDB: [] };
            // localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                payload.localStorage[key] = localStorage.getItem(key);
            }
            // indexedDB (best-effort)
            const dbs = await collectIndexedDB();
            payload.indexedDB = dbs;

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `arcade-backup-${ts}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            if (hintsDisplay) hintsDisplay.textContent = 'Backup ready for download.';
        } catch (e) {
            console.error('Backup failed', e);
            if (hintsDisplay) hintsDisplay.textContent = 'Backup failed — see console.';
            alert('Backup failed: ' + (e && e.message));
        }
    }

    async function restoreBackupFile(file) {
        try {
            if (!file) return;
            if (!confirm('Restore will overwrite your current localStorage and attempt to restore IndexedDB. Continue?')) return;
            const text = await file.text();
            const data = JSON.parse(text);
            if (data.localStorage) {
                for (const k of Object.keys(data.localStorage)) {
                    try { localStorage.setItem(k, data.localStorage[k]); } catch (e) {}
                }
            }
            if (Array.isArray(data.indexedDB) && data.indexedDB.length > 0 && 'indexedDB' in window) {
                if (hintsDisplay) hintsDisplay.textContent = 'Restoring IndexedDB (this may take a moment)...';
                for (const dbInfo of data.indexedDB) {
                    try {
                        // delete existing DB
                        await new Promise((resolve, reject) => {
                            const del = indexedDB.deleteDatabase(dbInfo.name);
                            del.onsuccess = () => resolve();
                            del.onerror = () => resolve();
                            del.onblocked = () => setTimeout(resolve, 500);
                        });

                        // recreate DB and stores
                        await new Promise((resolve, reject) => {
                            const openReq = indexedDB.open(dbInfo.name, dbInfo.version || 1);
                            openReq.onupgradeneeded = (evt) => {
                                const db = openReq.result;
                                for (const storeName of Object.keys(dbInfo.stores || {})) {
                                    if (!db.objectStoreNames.contains(storeName)) {
                                        try { db.createObjectStore(storeName); } catch (e) {}
                                    }
                                }
                            };
                            openReq.onsuccess = async () => {
                                try {
                                    const db = openReq.result;
                                    // write data
                                    const storeNames = Object.keys(dbInfo.stores || {});
                                    if (storeNames.length > 0) {
                                        const tx = db.transaction(storeNames, 'readwrite');
                                        for (const storeName of storeNames) {
                                            const store = tx.objectStore(storeName);
                                            const { keys = [], values = [] } = dbInfo.stores[storeName] || {};
                                            for (let i = 0; i < values.length; i++) {
                                                try {
                                                    if (i < keys.length && keys[i] !== undefined) store.put(values[i], keys[i]);
                                                    else store.put(values[i]);
                                                } catch (e) {}
                                            }
                                        }
                                        tx.oncomplete = () => { db.close(); resolve(); };
                                        tx.onerror = () => { db.close(); resolve(); };
                                    } else {
                                        db.close(); resolve();
                                    }
                                } catch (e) { resolve(); }
                            };
                            openReq.onerror = () => resolve();
                        });
                    } catch (e) {
                        console.warn('Failed restoring DB', dbInfo.name, e);
                    }
                }
                if (hintsDisplay) hintsDisplay.textContent = 'IndexedDB restore complete.';
            }
            alert('Restore finished. Reload the page to ensure changes take effect.');
        } catch (e) {
            console.error('Restore failed', e);
            alert('Restore failed: ' + (e && e.message));
        }
    }

    if (backupBtn) backupBtn.addEventListener('click', exportBackup);
    if (restoreBtn && backupFileInput) {
        restoreBtn.addEventListener('click', () => backupFileInput.click());
        backupFileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) restoreBackupFile(f);
            backupFileInput.value = '';
        });
    }

    function closeControllerBindingsPanel() {
        if (!controllerBindingsOverlay) return;
        controllerBindingsOverlay.hidden = true;
        controllerBindingCapture = null;
        updateBindingsUI();
    }

    if (controllerBindingsCloseBtn) {
        controllerBindingsCloseBtn.addEventListener('click', closeControllerBindingsPanel);
    }

    if (controllerBindingsResetBtn) {
        controllerBindingsResetBtn.addEventListener('click', () => {
            resetControllerBindings();
        });
    }

    if (controllerBindingsOverlay) {
        controllerBindingsOverlay.addEventListener('click', (event) => {
            if (event.target === controllerBindingsOverlay) {
                closeControllerBindingsPanel();
            }
        });
    }

    window.addEventListener('gamepadconnected', () => {
        handleUserInteraction();
        if (controllerBindingsOverlay && !controllerBindingsOverlay.hidden) {
            updateBindingsUI();
        }
    });

    loadEntryUpdates();
    loadFlashKeyBindings();
    loadArcadeSettings();
    applySettingsToUI();
    updateCrtOverlayState();
    loadLibrary();
    updateBindingsUI();
    renderFlashBindingsUI();
    syncRuntimeButtonVisibility();
})();
