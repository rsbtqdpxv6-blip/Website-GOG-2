// sorry if code is unoptimized, I am not THE GREATEST programmer. I just wanted to make a website for my personal use, and I wanted to share it with the world. BUT DW I WILL UPDATE THIS MORE., but if you want to use it, feel free to do so (ITS OPEN SOURCE FOR A REASON). I will not be responsible for any issues that may arise from using this code, fix it yourself lol. But i have specified a lot of stuff below. Enjoy! (holy crap this is a lot of code, I will try to comment it as much as possible, but if you have any questions, feel free to ask me on discord: xexo0059)
//EVERYTHINGS IN ASSETS FOLDER, SO IF YOU WANT TO CHANGE ANYTHING, GO THERE. (I will add more stuff to the assets folder later, but for now, this is all you need to know)
(() => { 
    let gameLibrary = [];
    let currentSystemIdx = 0;
    let currentGameIdx = 0;
    let currentViewMode = "WHEEL"; 

    const theta = 35; 
    const radius = 380; 
    const flatCardSpacing = 340; 

    // --- sounds---
    const soundScroll = new Audio('assets/sound/scroll.wav');
    const soundSelect = new Audio('assets/sound/select.wav');
    const soundLaunch = new Audio('assets/sound/launch.wav');
    const soundBack   = new Audio('assets/sound/back.wav');

    // --- better audio handling ---
    let audioPrimed = false;
    let audioUnlocked = false;

    // Browser audio must be started by a trusted user gesture.
    function playArcadeSound(audioObject) {
        if (!audioObject) return;

        try {
            audioObject.pause();
            audioObject.currentTime = 0; 
            
            let playPromise = audioObject.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audioUnlocked = true;
                }).catch(error => {
                    if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
                        console.warn("Speaker track blocked by hardware layer restriction:", error);
                    }
                });
            }
        } catch (soundError) {
            console.warn("Audio Context native playback exception:", soundError);
        }
    }

    // const DOM elements
    const wheelStage = document.getElementById('wheel-stage');
    const gamelistView = document.getElementById('gamelist-view');
    const carousel = document.getElementById('carousel-view');
    const titlesColumn = document.getElementById('game-titles-column');
    const systemDisplay = document.getElementById('system-display');
    const counterDisplay = document.getElementById('counter-display');
    const hintsDisplay = document.getElementById('control-hints');
    const gameTitleElement = document.getElementById('game-title');
    const gameDescriptionElement = document.getElementById('game-description');
    const favoriteGameBtn = document.getElementById('favorite-game-btn');
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
    const settingsSaveBtn = document.getElementById('settings-save');
    const settingsSystemList = document.getElementById('settings-system-list');
    const threadedCoresSwitch = document.getElementById('settings-threaded-cores');
    const searchBtn = document.getElementById('search-btn');
    const searchPanel = document.getElementById('gamelist-search-panel');
    const searchInput = document.getElementById('gamelist-search-input');
    const searchScopeSelect = document.getElementById('gamelist-search-scope');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const flashBindingsOverlay = document.getElementById('flash-bindings-overlay');
    const flashBindingsCloseBtn = document.getElementById('flash-bindings-close');
    const flashBindingsAddBtn = document.getElementById('flash-bindings-add');
    const flashBindingsExportBtn = document.getElementById('flash-bindings-export');
    const flashBindingsList = document.getElementById('flash-bindings-list');
    const previewPane = document.querySelector('.preview-pane');
    const fanartBox = document.getElementById('game-fanart-box');
    const crtOverlay = document.getElementById('crt-overlay');
    const crtEnabledSwitch = document.getElementById('settings-crt-enabled');
    const confettiOverlay = document.getElementById('shop-confetti-overlay');
    const confettiGif = document.getElementById('shop-confetti-gif');
    const confettiGifConfig = {
        source: 'assets/confetti.gif',
        durationMs: 1800,
        size: 'min(100vw, 900px)',
        opacity: 1,
        fit: 'contain'
    };
    const lowPerformanceSwitch = document.getElementById('settings-low-performance');
    const crtCanvas = document.getElementById('crt-distortion-canvas');
    const achievementsBtn = document.getElementById('achievements-btn');
    const achievementsOverlay = document.getElementById('achievements-overlay');
    const achievementsCloseBtn = document.getElementById('achievements-close');
    const shopBtn = document.getElementById('shop-btn');
    const accountBtn = document.getElementById('account-btn');
    const accountOverlay = document.getElementById('account-overlay');
    const accountCloseBtn = document.getElementById('account-close');
    const accountPanelTitle = document.getElementById('account-panel-title');
    const accountPanelSubtitle = document.getElementById('account-panel-subtitle');
    const accountStatus = document.getElementById('account-status');
    const accountMethodToggle = document.getElementById('account-method-toggle');
    const accountUsernameInput = document.getElementById('account-username');
    const accountPasswordForm = document.getElementById('account-password-form');
    const accountPasswordNameLabel = document.getElementById('account-password-name-label');
    const accountPasswordNameInput = document.getElementById('account-password-name');
    const accountPasswordInput = document.getElementById('account-password');
    const accountChangeEmailBtn = document.getElementById('account-change-email');
    const accountSignedIn = document.getElementById('account-signed-in');
    const accountUserLabel = document.getElementById('account-user-label');
    const accountUserEmail = document.getElementById('account-user-email');
    const accountSignOutBtn = document.getElementById('account-sign-out');
    const accountModeToggle = document.getElementById('account-mode-toggle');
    const shopOverlay = document.getElementById('shop-overlay');
    const shopCloseBtn = document.getElementById('shop-close');
    const shopPointsLabel = document.getElementById('shop-points-label');
    const achievementsList = document.getElementById('achievements-list');
    const achievementsSummary = document.getElementById('achievements-summary');
    const achievementShopList = document.getElementById('achievement-shop-list');
    const achievementPoints = document.getElementById('achievement-points');
    let crtCanvasCtx = crtCanvas ? crtCanvas.getContext('2d') : null;
    let crtAnimationFrame = null;

    let controllerPollFrame = null;
    let carouselCards = [];
    let gameRowItems = [];
    let gamelistFolderStack = []; // stack of folder path segments for drill-down
    let displayedGamelistItems = []; // current visible items (folders + games)
    let gamelistSearchQuery = '';
    let gamelistSearchScope = 'current';
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
    const FAVORITES_STORAGE_KEY = 'arcadeFavoriteGameIds';
    let arcadeSettings = { threadedCores: false, crtEnabled: false, lowPerformance: false };
    let settingsDefaults = { threadedCores: false, crtEnabled: false, lowPerformance: false, systems: {} };
    let favoriteGameIds = new Set();
    let achievementDefinitions = [];
    let achievementShopItems = [];
    const ACHIEVEMENT_STORAGE_KEY = 'arcadeAchievements';
    let achievementState = {
        unlocked: {},
        stats: {
            gamesStarted: 0,
            playTimeSeconds: 0,
            siteTimeSeconds: 0,
            favoritesAdded: 0,
            searchesUsed: 0,
            randomPicks: 0,
            controllersConnected: 0,
            longestSessionSeconds: 0
        },
        systemStats: {},
        coreStats: {},
        gameStats: {},
        playedSystems: [],
        purchasedShopItems: [],
        enabledShopItems: [],
        bonusPoints: 0,
        pointsCheatClaimed: false
    };
    let activeAchievementSession = null;
    let siteStartedAt = Date.now();
    let achievementSiteTimer = null;
    let achievementSaveTimer = null;
    const AUTH_STORAGE_KEY = 'arcadeAuthUser';
    const authApiBaseUrl = window.ARCADE_AUTH_CONFIG?.apiBaseUrl?.replace(/\/$/, '');
    let accountMode = 'signin';
    let accountSyncTimer = null;
    let accountSyncInFlight = false;
    let accountSyncDirty = false;
    let accountData = { data: {} };

    function shouldPreferLowPerformanceMode() {
        const memoryLimit = navigator.deviceMemory && navigator.deviceMemory <= 4;
        const processorLimit = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
        return memoryLimit || processorLimit;
    }

    const accountStorageKeys = [
        ACHIEVEMENT_STORAGE_KEY,
        FAVORITES_STORAGE_KEY,
        SETTINGS_KEY,
        'flash-runtime-keybindings'
    ];

    function resetAccountRuntimeState() {
        achievementState = {
            unlocked: {},
            stats: {
                gamesStarted: 0,
                playTimeSeconds: 0,
                siteTimeSeconds: 0,
                favoritesAdded: 0,
                searchesUsed: 0,
                randomPicks: 0,
                controllersConnected: 0,
                longestSessionSeconds: 0
            },
            systemStats: {},
            coreStats: {},
            gameStats: {},
            playedSystems: [],
            purchasedShopItems: [],
            enabledShopItems: [],
            bonusPoints: 0,
            pointsCheatClaimed: false
        };
        favoriteGameIds = new Set();
        activeAchievementSession = null;
        applyPurchasedShopEffects();
    }

    function prepareAccountSwitch() {
        accountData = { data: {} };
        accountSyncDirty = false;
        if (accountSyncTimer !== null) window.clearTimeout(accountSyncTimer);
        accountSyncTimer = null;
        resetAccountRuntimeState();
    }

    function isAccountSignedIn() {
        return window.__arcadeAuthSignedIn === true;
    }

    window.__arcadeAuthSignedIn = false;

    function getStoredAccountUser() {
        try {
            const user = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
            return user && typeof user === 'object' ? user : null;
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }
    }
    function getAccountStorageKey(key) {
        const username = getStoredAccountUser()?.username;
        return username ? `arcadeAccount:${username}:${key}` : key;
    }

    function getAccountStorageValue(key) {
        return localStorage.getItem(getAccountStorageKey(key));
    }

    function setAccountStorageValue(key, value) {
        localStorage.setItem(getAccountStorageKey(key), value);
    }

    function removeAccountStorageValue(key) {
        localStorage.removeItem(getAccountStorageKey(key));
    }

    async function readAuthResponse(response) {
        const text = await response.text();
        if (!text.trim()) return {};
        try { return JSON.parse(text); }
        catch { throw new Error(`Authentication server returned invalid data (${response.status}).`); }
    }

    function getAccountPayload() {
        const data = {};
        accountStorageKeys.forEach((key) => {
            const value = getAccountStorageValue(key);
            if (value !== null) data[key] = value;
        });
        return { data, saves: accountData.saves || {} };
    }

    async function syncAccountData() {
        if (!isAccountSignedIn() || !authApiBaseUrl || accountSyncInFlight) return;
        accountSyncInFlight = true;
        const payload = getAccountPayload();
        accountData.data = payload.data;
        try {
            const response = await fetch(`${authApiBaseUrl}/auth/data`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Account sync failed (${response.status}).`);
            accountSyncDirty = false;
        } catch (error) {
            console.warn('Unable to sync account data:', error);
        } finally {
            accountSyncInFlight = false;
            if (accountSyncDirty) queueAccountSync();
        }
    }

    async function flushAccountData() {
        if (achievementSaveTimer !== null) {
            window.clearTimeout(achievementSaveTimer);
            achievementSaveTimer = null;
            saveAchievementState();
        }
        if (accountSyncTimer !== null) {
            window.clearTimeout(accountSyncTimer);
            accountSyncTimer = null;
        }
        if (accountSyncDirty && !accountSyncInFlight) await syncAccountData();
    }

    function queueAccountSync() {
        if (!isAccountSignedIn()) return;
        accountSyncDirty = true;
        if (window.__arcadeActiveRuntimeGame || accountSyncTimer !== null || accountSyncInFlight) return;
        accountSyncTimer = window.setTimeout(() => {
            accountSyncTimer = null;
            syncAccountData();
        }, 300);
    }

    async function loadAccountData() {
        if (!isAccountSignedIn() || !authApiBaseUrl) return;
        try {
            const response = await fetch(`${authApiBaseUrl}/auth/data`, { credentials: 'include' });
            if (!response.ok) throw new Error('Unable to load account data.');
            accountData = await readAuthResponse(response);
            accountSyncDirty = false;
            resetAccountRuntimeState();
            accountStorageKeys.forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(accountData.data || {}, key)) setAccountStorageValue(key, accountData.data[key]);
                else removeAccountStorageValue(key);
            });
            loadAchievementState();
            loadFavoriteGameIds();
            loadFlashKeyBindings();
            loadArcadeSettings();
        } catch (error) {
            console.warn('Unable to load account data:', error);
        }
    }

    function encodeSave(bytes) {
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    function decodeSave(value) {
        const binary = atob(value);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }

    window.__arcadeAccountStorage = {
        isSignedIn: isAccountSignedIn,
        loadSave: (token) => accountData.saves?.[token] ? decodeSave(accountData.saves[token]) : null,
        saveSave: (token, bytes) => {
            if (!isAccountSignedIn()) return false;
            accountData.saves[token] = encodeSave(bytes);
            queueAccountSync();
            return true;
        }
    };

    function setAccountStatus(message, type = '') {
        if (!accountStatus) return;
        accountStatus.textContent = message;
        accountStatus.dataset.type = type;
    }

    function renderAccountUI() {
        const user = getStoredAccountUser();
        const signedIn = Boolean(user?.username);
        window.__arcadeAuthSignedIn = signedIn;
        if (favoriteGameBtn) favoriteGameBtn.hidden = !signedIn;
        accountPasswordForm.hidden = signedIn;
        accountSignedIn.hidden = !signedIn;
        accountModeToggle.hidden = signedIn;
        accountMethodToggle.hidden = true;
        if (signedIn) {
            accountUserLabel.textContent = user.name || 'Arcade player';
            accountUserEmail.textContent = `@${user.username}`;
            accountBtn.textContent = user.name || 'Account';
        } else {
            accountBtn.textContent = 'Sign in';
            accountPanelTitle.textContent = accountMode === 'signup' ? 'Create your arcade account' : 'Arcade account';
            accountPanelSubtitle.textContent = 'Sign in with your username and password.';
            accountPasswordNameLabel.hidden = accountMode !== 'signup';
            accountPasswordNameInput.hidden = accountMode !== 'signup';
            accountModeToggle.textContent = accountMode === 'signup' ? 'I already have an account' : 'Create an account';
            const passwordSubmit = accountPasswordForm.querySelector('button[type="submit"]');
            if (passwordSubmit) passwordSubmit.textContent = accountMode === 'signup' ? 'Create account' : 'Sign in';
        }
    }

    function openAccountPanel() {
        if (!accountOverlay) return;
        renderAccountUI();
        setAccountStatus('');
        accountOverlay.hidden = false;
        if (!accountSignedIn.hidden) return;
        accountUsernameInput.focus();
    }

    function closeAccountPanel() {
        if (accountOverlay) accountOverlay.hidden = true;
    }

    function handleAuthRedirectError() {
        return;
    }

    async function submitPasswordAuth(event) {
        event.preventDefault();
        if (!authApiBaseUrl) {
            setAccountStatus('The username authentication server is not configured.', 'error');
            return;
        }
        const username = accountUsernameInput.value.trim();
        const password = accountPasswordInput.value;
        const name = accountPasswordNameInput.value.trim();
        setAccountStatus(accountMode === 'signup' ? 'Creating your account...' : 'Signing you in...');
        try {
            const response = await fetch(`${authApiBaseUrl}/auth/${accountMode === 'signup' ? 'signup' : 'signin'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password, name })
            });
            const result = await readAuthResponse(response);
            if (!response.ok) throw new Error(result.error || 'Unable to authenticate.');
            prepareAccountSwitch();
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result));
            window.__arcadeAuthSignedIn = true;
            await loadAccountData();
            loadAchievementState();
            setAccountStatus(accountMode === 'signup' ? 'Account created. You are signed in.' : 'You are signed in.', 'success');
            renderAccountUI();
        } catch (error) {
            setAccountStatus(error.message || 'Unable to authenticate.', 'error');
        }
    }

    async function signOutAccount() {
        await flushAccountData();
        if (authApiBaseUrl) await fetch(`${authApiBaseUrl}/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        window.__arcadeAuthSignedIn = false;
        accountSyncDirty = false;
        if (accountSyncTimer !== null) window.clearTimeout(accountSyncTimer);
        accountSyncTimer = null;
        accountData = { data: {}, saves: {} };
        resetAccountRuntimeState();
        localStorage.removeItem(AUTH_STORAGE_KEY);
        renderAccountUI();
        setAccountStatus('You are signed out.', 'success');
    }

    async function initializeAuth() {
        if (!authApiBaseUrl) return;
        try {
            const response = await fetch(`${authApiBaseUrl}/auth/me`, { credentials: 'include' });
            if (!response.ok) throw new Error('Not signed in');
            prepareAccountSwitch();
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(await readAuthResponse(response)));
            window.__arcadeAuthSignedIn = true;
            await loadAccountData();
        } catch {
            window.__arcadeAuthSignedIn = false;
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        renderAccountUI();
    }

    function loadAchievementState() {
        if (!isAccountSignedIn()) return;
        try {
            const saved = JSON.parse(getAccountStorageValue(ACHIEVEMENT_STORAGE_KEY) || '{}');
            achievementState = {
                ...achievementState,
                ...saved,
                stats: { ...achievementState.stats, ...(saved.stats || {}) },
                systemStats: saved.systemStats || {},
                coreStats: saved.coreStats || {},
                gameStats: saved.gameStats || {},
                playedSystems: Array.isArray(saved.playedSystems) ? saved.playedSystems : [],
                unlocked: saved.unlocked || {},
                purchasedShopItems: Array.isArray(saved.purchasedShopItems) ? saved.purchasedShopItems : [],
                enabledShopItems: Array.isArray(saved.enabledShopItems)
                    ? saved.enabledShopItems
                    : (Array.isArray(saved.purchasedShopItems) ? saved.purchasedShopItems : []),
                bonusPoints: Number.isFinite(saved.bonusPoints) ? saved.bonusPoints : 0,
                pointsCheatClaimed: saved.pointsCheatClaimed === true
            };
        } catch {
            removeAccountStorageValue(ACHIEVEMENT_STORAGE_KEY);
        }
    }

    function saveAchievementState() {
        if (!isAccountSignedIn()) return;
        setAccountStorageValue(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(achievementState));
        queueAccountSync();
    }

    function scheduleAchievementSave() {
        if (!isAccountSignedIn()) return;
        if (achievementSaveTimer !== null) return;
        achievementSaveTimer = window.setTimeout(() => {
            achievementSaveTimer = null;
            saveAchievementState();
        }, 500);
    }

    window.addEventListener('pagehide', () => {
        if (!isAccountSignedIn() || !authApiBaseUrl || !accountSyncDirty) return;
        const payload = getAccountPayload();
        fetch(`${authApiBaseUrl}/auth/data`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            keepalive: true,
            body: JSON.stringify(payload)
        }).catch(() => {});
    });

    function isAchievementPanelVisible() {
        return (achievementsOverlay && !achievementsOverlay.hidden) || (shopOverlay && !shopOverlay.hidden);
    }

    function getAchievementPoints() {
        if (!isAccountSignedIn()) return 0;
        const achievementPoints = achievementDefinitions.reduce((total, achievement) => {
            return total + (achievementState.unlocked[achievement.id] ? (achievement.points || 0) : 0);
        }, 0);
        return achievementPoints + achievementState.bonusPoints;
    }

    function getSpentAchievementPoints() {
        if (!isAccountSignedIn()) return 0;
        return achievementShopItems.reduce((total, item) => {
            return total + (achievementState.purchasedShopItems.includes(item.id) ? (item.cost || 0) : 0);
        }, 0);
    }

    function getAvailableAchievementPoints() {
        return Math.max(0, getAchievementPoints() - getSpentAchievementPoints());
    }

    function applyPurchasedShopEffects() {
        const enabled = achievementState.enabledShopItems;
        document.body.classList.toggle('shop-golden-wheel', enabled.includes('golden-wheel'));
        document.body.classList.toggle('shop-scanlines', enabled.includes('arcade-scanlines'));
        document.body.classList.toggle('shop-rainbow-accent', enabled.includes('rainbow-accent'));
        document.body.classList.toggle('shop-tiny-mode', enabled.includes('tiny-mode'));
        document.body.classList.toggle('shop-secret-message', enabled.includes('secret-message'));
    }

    function setShopItemEnabled(itemId, enabled) {
        if (!isAccountSignedIn()) return;
        if (!achievementState.purchasedShopItems.includes(itemId)) return;
        achievementState.enabledShopItems = achievementState.enabledShopItems.filter((id) => id !== itemId);
        if (enabled) achievementState.enabledShopItems.push(itemId);
        saveAchievementState();
        applyPurchasedShopEffects();
        if (isAchievementPanelVisible()) renderAchievementsUI();
    }

    function purchaseShopItem(itemId) {
        if (!isAccountSignedIn()) return;
        const item = achievementShopItems.find((candidate) => candidate.id === itemId);
        if (!item || achievementState.purchasedShopItems.includes(itemId)) return;
        if (getAvailableAchievementPoints() < item.cost) {
            if (hintsDisplay) hintsDisplay.textContent = `You need ${item.cost - getAvailableAchievementPoints()} more points.`;
            return;
        }
        achievementState.purchasedShopItems.push(itemId);
        achievementState.enabledShopItems.push(itemId);
        saveAchievementState();
        applyPurchasedShopEffects();
        if (isAchievementPanelVisible()) renderAchievementsUI();
        if (hintsDisplay) hintsDisplay.textContent = `Easter egg unlocked: ${item.title}`;
    }

    async function loadAchievements() {
        loadAchievementState();
        try {
            const response = await fetch('achievements.json');
            const data = await response.json();
            achievementDefinitions = Array.isArray(data?.achievements) ? data.achievements : [];
            achievementShopItems = Array.isArray(data?.shop) ? data.shop : [];
        } catch (error) {
            achievementDefinitions = [];
            achievementShopItems = [];
            console.warn('Unable to load achievements:', error);
        }
        applyPurchasedShopEffects();
        if (isAchievementPanelVisible()) renderAchievementsUI();
    }

    function incrementAchievementBucket(bucket, key, stat) {
        if (!bucket[key]) bucket[key] = {};
        bucket[key][stat] = (bucket[key][stat] || 0) + 1;
    }

    function getAchievementProgress(achievement) {
        if (achievement.type === 'uniqueSystems') return achievementState.playedSystems.length;
        if (achievement.type === 'allSystems') return achievementState.playedSystems.length;
        if (achievement.type === 'system') return achievementState.systemStats[achievement.system]?.[achievement.stat] || 0;
        if (achievement.type === 'core') return achievementState.coreStats[achievement.core]?.[achievement.stat] || 0;
        if (achievement.type === 'game') return achievementState.gameStats[achievement.gameTitle]?.[achievement.stat] || 0;
        return achievementState.stats[achievement.stat] || 0;
    }

    function evaluateAchievements() {
        if (!isAccountSignedIn()) return;
        achievementDefinitions.forEach((achievement) => {
            if (!achievement?.id || achievementState.unlocked[achievement.id]) return;
            const target = achievement.target || (achievement.type === 'allSystems'
                ? gameLibrary.filter((system) => system.system !== 'favorites').length
                : 1);
            if (getAchievementProgress(achievement) >= target) {
                achievementState.unlocked[achievement.id] = Date.now();
                if (hintsDisplay) hintsDisplay.textContent = `Achievement unlocked: ${achievement.title}`;
            }
        });
        scheduleAchievementSave();
        if (isAchievementPanelVisible()) renderAchievementsUI();
    }

    function recordAchievementGameStart(game) {
        if (!isAccountSignedIn()) return;
        if (!game || activeAchievementSession) return;
        const system = game.system || game.favoriteSystem || gameLibrary[currentSystemIdx]?.system || 'unknown';
        const core = game.core || 'unknown';
        const title = game.title || 'Untitled';
        activeAchievementSession = { startedAt: Date.now(), game, system, core, title };
        achievementState.stats.gamesStarted += 1;
        incrementAchievementBucket(achievementState.systemStats, system, 'gamesStarted');
        incrementAchievementBucket(achievementState.coreStats, core, 'gamesStarted');
        incrementAchievementBucket(achievementState.gameStats, title, 'gamesStarted');
        if (!achievementState.playedSystems.includes(system)) achievementState.playedSystems.push(system);
        if (achievementState.enabledShopItems.includes('confetti-launch')) {
            if (confettiOverlay) {
                if (confettiGif) {
                    confettiGif.src = confettiGifConfig.source;
                    confettiGif.style.width = confettiGifConfig.size;
                    confettiGif.style.height = confettiGifConfig.size;
                    confettiGif.style.opacity = String(confettiGifConfig.opacity);
                    confettiGif.style.objectFit = confettiGifConfig.fit;
                }
                confettiOverlay.classList.remove('active');
                void confettiOverlay.offsetWidth;
                confettiOverlay.classList.add('active');
                window.setTimeout(() => confettiOverlay.classList.remove('active'), confettiGifConfig.durationMs);
            }
        }
        evaluateAchievements();
    }

    function recordAchievementGameEnd() {
        if (!isAccountSignedIn()) {
            activeAchievementSession = null;
            return;
        }
        if (!activeAchievementSession) return;
        const elapsedSeconds = Math.max(0, Math.round((Date.now() - activeAchievementSession.startedAt) / 1000));
        achievementState.stats.playTimeSeconds += elapsedSeconds;
        achievementState.stats.longestSessionSeconds = Math.max(achievementState.stats.longestSessionSeconds, elapsedSeconds);
        if (elapsedSeconds >= 60) {
            achievementState.bonusPoints += 2;
            if (hintsDisplay) hintsDisplay.textContent = 'Session complete: +2 achievement points';
        }
        activeAchievementSession = null;
        evaluateAchievements();
    }

    function recordAchievementEvent(eventName, amount = 1) {
        if (!isAccountSignedIn()) return;
        achievementState.stats[eventName] = (achievementState.stats[eventName] || 0) + amount;
        evaluateAchievements();
    }

    function handleAchievementSessionChange(event) {
        if (event.detail?.game) recordAchievementGameStart(event.detail.game);
        else {
            recordAchievementGameEnd();
            if (accountSyncDirty) queueAccountSync();
        }
    }

    function renderAchievementsUI() {
        if (!achievementsList || !isAchievementPanelVisible()) return;
        const unlockedCount = achievementDefinitions.filter((item) => achievementState.unlocked[item.id]).length;
        if (achievementsSummary) achievementsSummary.textContent = `${unlockedCount} / ${achievementDefinitions.length} unlocked`;
        if (achievementPoints) achievementPoints.textContent = `${getAvailableAchievementPoints()} points available`;
        if (shopPointsLabel) shopPointsLabel.textContent = `${getAvailableAchievementPoints()} points available to spend on site effects.`;
        achievementsList.innerHTML = achievementDefinitions.map((achievement) => {
            const unlocked = !!achievementState.unlocked[achievement.id];
            const target = achievement.target || (achievement.type === 'allSystems' ? gameLibrary.filter((system) => system.system !== 'favorites').length : 1);
            const progress = Math.min(target, getAchievementProgress(achievement));
            return `<div class="achievement-row${unlocked ? ' is-unlocked' : ''}">
                <span class="achievement-icon">${achievement.icon || '*'}</span>
                <div><strong>${achievement.title}</strong><span>${achievement.description}</span></div>
                <b>${unlocked ? 'UNLOCKED' : `${progress} / ${target}`}</b>
            </div>`;
        }).join('');
        if (achievementShopList) {
            achievementShopList.innerHTML = achievementShopItems.map((item) => {
                const owned = achievementState.purchasedShopItems.includes(item.id);
                const affordable = getAvailableAchievementPoints() >= item.cost;
                const enabled = achievementState.enabledShopItems.includes(item.id);
                return `<div class="shop-item${owned ? ' is-owned' : ''}">
                    <span class="achievement-icon">${item.icon || '*'}</span>
                    <div><strong>${item.title}</strong><span>${item.description}</span></div>
                    ${owned
                        ? `<label class="shop-toggle" title="Turn ${enabled ? 'off' : 'on'} ${item.title}">
                            <input type="checkbox" data-shop-toggle="${item.id}" ${enabled ? 'checked' : ''} />
                            <span class="shop-toggle-track" aria-hidden="true"></span>
                        </label>`
                        : `<button type="button" data-shop-id="${item.id}" ${!affordable ? 'disabled' : ''}>${item.cost} POINTS</button>`}
                </div>`;
            }).join('');
        }
    }

    function loadFavoriteGameIds() {
        try {
            const saved = JSON.parse(getAccountStorageValue(FAVORITES_STORAGE_KEY) || '[]');
            favoriteGameIds = new Set(Array.isArray(saved) ? saved.map(String) : []);
        } catch {
            favoriteGameIds = new Set();
        }
    }

    function persistFavoriteGameIds() {
        setAccountStorageValue(FAVORITES_STORAGE_KEY, JSON.stringify([...favoriteGameIds]));
        queueAccountSync();
    }

    function isFavoriteGame(game) {
        return game?.game_id !== undefined && favoriteGameIds.has(String(game.game_id));
    }

    function updateFavoriteButton(game) {
        if (!favoriteGameBtn) return;
        const isFavorite = isFavoriteGame(game);
        favoriteGameBtn.classList.toggle('is-favorite', isFavorite);
        favoriteGameBtn.textContent = isFavorite ? '★' : '☆';
        favoriteGameBtn.setAttribute('aria-pressed', String(isFavorite));
        favoriteGameBtn.setAttribute('aria-label', isFavorite ? 'Remove game from favorites' : 'Add game to favorites');
        favoriteGameBtn.disabled = !game;
    }

    function rebuildFavoritesSystem() {
        const selectedSystemSlug = gameLibrary[currentSystemIdx]?.system;
        gameLibrary = gameLibrary.filter((system) => system.system !== 'favorites');

        const favoriteGames = [];
        gameLibrary.forEach((system) => {
            system.games.forEach((game) => {
                game.isFavorite = isFavoriteGame(game);
                if (game.isFavorite) {
                    favoriteGames.push({
                        ...game,
                        favoriteSystem: system.system,
                        favoriteSystemTitle: system.title
                    });
                }
            });
        });

        if (favoriteGames.length > 0) {
            gameLibrary.push({
                system: 'favorites',
                title: 'Favorites',
                core: 'favorites',
                games: favoriteGames
            });
        }

        const selectedIndex = gameLibrary.findIndex((system) => system.system === selectedSystemSlug);
        currentSystemIdx = selectedIndex >= 0 ? selectedIndex : getFirstVisibleSystemIndex();
    }

    async function loadArcadeSettings() {
        try {
            const response = await fetch('settings.json');
            settingsDefaults = await response.json();
        } catch {
            settingsDefaults = { threadedCores: false, crtEnabled: false, lowPerformance: false, systems: {} };
        }

        try {
            const saved = JSON.parse(getAccountStorageValue(SETTINGS_KEY) || '{}');
            arcadeSettings = {
                threadedCores: saved.threadedCores ?? settingsDefaults.threadedCores === true,
                crtEnabled: saved.crtEnabled ?? settingsDefaults.crtEnabled === true,
                lowPerformance: saved.lowPerformance ?? (settingsDefaults.lowPerformance === true || shouldPreferLowPerformanceMode()),
                systems: {
                    ...(settingsDefaults.systems || {}),
                    ...(saved.systems || {})
                }
            };
        } catch {
            arcadeSettings = {
                threadedCores: settingsDefaults.threadedCores === true,
                crtEnabled: settingsDefaults.crtEnabled === true,
                lowPerformance: settingsDefaults.lowPerformance === true || shouldPreferLowPerformanceMode(),
                systems: { ...(settingsDefaults.systems || {}) }
            };
        }
        window.__arcadeEmulatorSettings = { ...arcadeSettings };
        applyLowPerformanceMode();
    }

    function persistArcadeSettings() {
        setAccountStorageValue(SETTINGS_KEY, JSON.stringify(arcadeSettings));
        window.__arcadeEmulatorSettings = { ...arcadeSettings };
        queueAccountSync();
    }

    function resizeCrtCanvas() {
        if (!crtCanvas) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
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
        if (!crtCanvasCtx || !arcadeSettings.crtEnabled || arcadeSettings.lowPerformance) return;

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

        if (arcadeSettings.crtEnabled && !arcadeSettings.lowPerformance) {
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
        if (lowPerformanceSwitch) {
            lowPerformanceSwitch.checked = !!arcadeSettings.lowPerformance;
        }
        applyLowPerformanceMode();
        renderSystemSettingsUI();
    }

    function applyLowPerformanceMode() {
        document.body.classList.toggle('low-performance-mode', !!arcadeSettings.lowPerformance);
        updateCrtOverlayState();
    }

    function renderSystemSettingsUI() {
        if (!settingsSystemList) return;
        const systems = gameLibrary.filter((system) => system.system !== 'favorites');
        settingsSystemList.innerHTML = systems.map((system) => {
            const settings = arcadeSettings.systems?.[system.system] || {};
            const background = settings.background || system.background || '#1b1e24';
            const core = settings.core || system.core || '';
            return `
                <div class="settings-system-row" data-system="${system.system}">
                    <strong>${system.title}</strong>
                    <label>Background <input class="settings-background-input" type="text" value="${background}" maxlength="7" pattern="#[0-9a-fA-F]{6}" /></label>
                    <label>Core <input class="settings-core-input" type="text" value="${core}" /></label>
                </div>
            `;
        }).join('');
    }

    function applySettingsToLibrary() {
        gameLibrary.forEach((system) => {
            const settings = arcadeSettings.systems?.[system.system];
            if (!settings) return;
            if (settings.background) system.background = settings.background;
            if (settings.core) {
                system.core = settings.core;
                system.games.forEach((game) => {
                    game.core = settings.core;
                });
            }
        });
    }

    function saveSettingsFromUI() {
        const systems = {};
        settingsSystemList?.querySelectorAll('.settings-system-row').forEach((row) => {
            const system = row.dataset.system;
            const background = row.querySelector('.settings-background-input')?.value.trim();
            const core = row.querySelector('.settings-core-input')?.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(background) && core) {
                systems[system] = { background, core };
            }
        });
        arcadeSettings = {
            threadedCores: !!threadedCoresSwitch?.checked,
            crtEnabled: !!crtEnabledSwitch?.checked,
            lowPerformance: !!lowPerformanceSwitch?.checked,
            systems
        };
        persistArcadeSettings();
        applySettingsToLibrary();
        renderWheel();
        updateWheelSelection(currentSystemIdx, false);
        closeSettingsPanel();
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
    let pointsCheatProgress = 0;
    const pointsCheatSequence = ['2', '0', '1', '5', 'b'];

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

    //looks like YOU found the secret to my secret core! (its W-E-S) (I will add more secret stuff later, but for now, this is the only secret core you can unlock)
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

    function handlePointsCheatKey(rawKey) {
        if (currentViewMode !== 'WHEEL' || achievementState.pointsCheatClaimed) return;
        const keyLower = (rawKey || '').toLowerCase();
        if (keyLower === pointsCheatSequence[pointsCheatProgress]) {
            pointsCheatProgress += 1;
            if (pointsCheatProgress === pointsCheatSequence.length) {
                achievementState.pointsCheatClaimed = true;
                achievementState.bonusPoints += 200;
                pointsCheatProgress = 0;
                saveAchievementState();
                if (hintsDisplay) hintsDisplay.textContent = 'Secret bonus unlocked: +200 achievement points';
                if (isAchievementPanelVisible()) renderAchievementsUI();
            }
        } else {
            pointsCheatProgress = keyLower === pointsCheatSequence[0] ? 1 : 0;
        }
    }
    // Flash runtime keybinding management
    let flashKeyBindings = [
        { key: 'ArrowLeft', action: 'previous', label: 'D-pad Left' },
        { key: 'ArrowRight', action: 'next', label: 'D-pad Right' },
        { key: 'ArrowUp', action: 'up', label: 'D-pad Up' },
        { key: 'ArrowDown', action: 'down', label: 'D-pad Down' },
        { key: 'Enter', action: 'select', label: 'A / Select' },
        { key: 'Backspace', action: 'back', label: 'B / Back' },
        { key: 'x', action: 'random', label: 'X / Random' }
    ];
// more bindings and stuff
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
//co`ntroller profile detection and binding defaults
    function getControllerProfile(pad) {
        const id = (pad?.id || '').toLowerCase();
        if (!id) return 'generic';
        if (id.includes('xbox') || id.includes('xinput')) return 'xbox';
        if (id.includes('playstation') || id.includes('ps') || id.includes('dualshock') || id.includes('dualsense')) return 'playstation';
        if (id.includes('switch') || id.includes('pro controller')) return 'switch';
        return 'generic';
    }
//get controller binding defaults based on profile
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
//get controller binding defaults based on profile
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
//get controller binding defaults based on profile
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
    } // THIS CODE TOOK SO LONG TO WRITE WITH CHROMEBOOK NOTEPAD OR WHATEVER YOU CALL IT (i was on a school chromebook)

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
//get controller binding defaults based on profile
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
//flash key stuff
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
        flashKeyBindings = [
            { key: 'ArrowLeft', action: 'previous', label: 'D-pad Left' },
            { key: 'ArrowRight', action: 'next', label: 'D-pad Right' },
            { key: 'ArrowUp', action: 'up', label: 'D-pad Up' },
            { key: 'ArrowDown', action: 'down', label: 'D-pad Down' },
            { key: 'Enter', action: 'select', label: 'A / Select' },
            { key: 'Backspace', action: 'back', label: 'B / Back' },
            { key: 'x', action: 'random', label: 'X / Random' }
        ];
        try {
            const saved = getAccountStorageValue('flash-runtime-keybindings');
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
            setAccountStorageValue('flash-runtime-keybindings', JSON.stringify(flashKeyBindings));
            queueAccountSync();
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
    } // i think this is the end to my flash keybind code (pain in the butt to write, but it works now, so im happy)

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
// Tame compared to the flash keybind code, this controller binding code is a lot easier to write and understand (i think)
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
// i was wrong, usb controllers only work on chrome and edge, not firefox (i tested it on my chromebook and it works fine, but on my desktop with firefox, it does not work at all, atleast i think) AND ALSO WIRELESS CONTROLLERS DONT EVEN DO ANYTHING
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
    // i give up writing figure it out yourself
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
                        recordAchievementEvent('randomPicks');
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
                    if (selectedGame.core === "ebooks") {
                        launchEbook(selectedGame, hintsDisplay);
                    } else if (selectedGame.core === "native_html") {
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
                        recordAchievementEvent('randomPicks');
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
        scheduleControllerPoll();
    }

    function scheduleControllerPoll() {
        if (arcadeSettings.lowPerformance) {
            controllerPollFrame = window.setTimeout(pollControllerInput, 100);
        } else {
            controllerPollFrame = requestAnimationFrame(pollControllerInput);
        }
    }

    function pollControllerInput() {
        scheduleControllerPoll();

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
            const [settingsResult, libraryResponse] = await Promise.all([
                loadArcadeSettings(),
                fetch('library.json')
            ]);
            void settingsResult;
            gameLibrary = await libraryResponse.json();
            applySettingsToLibrary();
            loadFavoriteGameIds();
            rebuildFavoritesSystem();
            applySettingsToUI();
            
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
            const iconMarkup = sys.system === 'favorites'
                ? '<div class="favorites-wheel-icon" aria-hidden="true">★</div>'
                : `<img src="assets/icons/${sys.system}.webp" alt="Icon" onerror="this.src='assets/icons/secret.webp'">`;
            card.innerHTML = `
                <div class="icon-wrapper">${iconMarkup}</div>
                <div class="card-title">${sys.title}</div>
            `;
            const icon = card.querySelector('img');
            if (icon) {
                icon.loading = 'lazy';
                icon.decoding = 'async';
            }
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
        const activeCardObj = carouselCards[selectedVisiblePosition];
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
        document.body.style.setProperty('--system-bg-color', data.background || '#1b1e24');
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

        let result = [];
        const query = gamelistSearchQuery.trim().toLowerCase();

        if (gamelistSearchScope === 'all') {
            const allSystemMatches = [];
            gameLibrary.forEach((system, systemIndex) => {
                if (!system || !Array.isArray(system.games)) return;
                system.games.forEach((game, origIndex) => {
                    const title = game.title || 'Untitled';
                    const matchesQuery = !query || title.toLowerCase().includes(query);
                    if (matchesQuery) {
                        allSystemMatches.push({
                            type: 'game',
                            title,
                            origIndex,
                            game,
                            systemIndex,
                            systemTitle: system.title || system.system || 'System'
                        });
                    }
                });
            });
            result = allSystemMatches.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
            return result;
        }

        if (currentSystem.system === 'favorites') {
            if (gamelistFolderStack.length === 0) {
                const folders = new Map();
                currentSystem.games.forEach((game, origIndex) => {
                    if (!folders.has(game.favoriteSystem)) {
                        folders.set(game.favoriteSystem, {
                            type: 'folder',
                            name: game.favoriteSystem,
                            title: game.favoriteSystemTitle,
                            childrenCount: 0
                        });
                    }
                    folders.get(game.favoriteSystem).childrenCount += 1;
                });
                result = [...folders.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
            } else {
                const favoriteSystem = gamelistFolderStack[0];
                result = currentSystem.games
                    .map((game, origIndex) => ({ type: 'game', title: game.title || 'Untitled', origIndex, game }))
                    .filter((item) => item.game.favoriteSystem === favoriteSystem)
                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
            }
        } else {
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
            result = [...folders, ...games];
        }

        if (query) {
            result = result.filter((item) => {
                const label = String(item.type === 'folder' ? (item.title || item.name || '') : (item.title || '')).toLowerCase();
                return label.includes(query);
            });
        }

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
            const emptyMessage = gamelistSearchQuery.trim()
                ? `No results for "${gamelistSearchQuery.trim()}".`
                : 'No games found in this folder.';
            titlesColumn.innerHTML = `<div style="text-align:center; padding:20px; color:#555;">${emptyMessage}</div>`;
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
                const displayTitle = gamelistSearchScope === 'all' && item.systemTitle ? `${item.systemTitle}: ${item.title || 'Untitled'}` : (item.title || 'Untitled');
                row.textContent = displayTitle;
                row.dataset.type = 'game';
                row.dataset.gameIndex = item.origIndex;
                if (typeof item.systemIndex === 'number') {
                    row.dataset.systemIndex = String(item.systemIndex);
                }
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
        if (!item) {
            updateFavoriteButton(null);
            return;
        }

        if (typeof item.systemIndex === 'number' && item.systemIndex !== currentSystemIdx) {
            currentSystemIdx = item.systemIndex;
        }

        const currentSystem = gameLibrary[currentSystemIdx];
        if (!currentSystem) return;

        if (item.type === 'folder') {
            updateFavoriteButton(null);
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

        if (gameDescriptionElement) {
            gameDescriptionElement.textContent = targetGame.description || 'No description available.';
        }

        if (gameBoxartElement) {
            gameBoxartElement.onerror = null;
            gameBoxartElement.onerror = function() {
                this.onerror = null;
                this.src = 'assets/icons/default_boxart.webp';
            };
            gameBoxartElement.src = targetGame.boxart || 'assets/icons/default_boxart.webp';
        }
        updateFavoriteButton(targetGame);

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

    function closeSearchPanel() {
        if (!searchPanel) return;
        searchPanel.hidden = true;

        if (searchInput) {
            searchInput.value = '';
        }
        if (searchScopeSelect) {
            searchScopeSelect.value = 'current';
        }

        gamelistSearchQuery = '';
        gamelistSearchScope = 'current';
        refreshGamelistUI();

        if (displayedGamelistItems.length > 0) {
            updateGameSelection(Math.min(currentGameIdx, Math.max(0, displayedGamelistItems.length - 1)), false, false);
        } else {
            updateFavoriteButton(null);
            if (gameTitleElement) gameTitleElement.textContent = 'No games available';
            if (counterDisplay) counterDisplay.textContent = '0 / 0';
        }
    }

    function toggleSearchPanel() {
        if (!searchPanel || !searchInput) return;
        if (currentViewMode !== 'GAMELIST') {
            setViewMode('GAMELIST');
        }
        const isHidden = searchPanel.hidden;
        searchPanel.hidden = !isHidden;
        if (isHidden) {
            setTimeout(() => {
                searchInput.focus();
                searchInput.select();
            }, 0);
        } else {
            closeSearchPanel();
        }
    }

    function toggleFavoriteSelectedGame() {
        if (currentViewMode !== 'GAMELIST') return;
        const item = displayedGamelistItems[currentGameIdx];
        const game = item?.type === 'game' ? item.game : null;
        if (!game || game.game_id === undefined) return;

        const gameId = String(game.game_id);
        if (favoriteGameIds.has(gameId)) {
            favoriteGameIds.delete(gameId);
        } else {
            favoriteGameIds.add(gameId);
        }
        persistFavoriteGameIds();
        recordAchievementEvent('favoritesAdded');

        const wasFavoritesSystem = gameLibrary[currentSystemIdx]?.system === 'favorites';
        rebuildFavoritesSystem();

        if (wasFavoritesSystem && gameLibrary[currentSystemIdx]?.system !== 'favorites') {
            setViewMode('WHEEL');
            renderWheel();
            updateWheelSelection(currentSystemIdx, false);
            return;
        }

        if (wasFavoritesSystem && gamelistFolderStack.length > 0) {
            const folderStillHasGames = gameLibrary[currentSystemIdx].games.some((favoriteGame) => favoriteGame.favoriteSystem === gamelistFolderStack[0]);
            if (!folderStillHasGames) gamelistFolderStack = [];
        }

        refreshGamelistUI();
        updateGameSelection(Math.min(currentGameIdx, Math.max(0, displayedGamelistItems.length - 1)), false, false);
        renderWheel();
        updateWheelSelection(currentSystemIdx, false);
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
                if (activeGame.core === "native_html" || activeGame.core === "ebooks") {
                    closeHtmlGame(hintsDisplay);
                } else {
                    closeGameWithSave(activeGame, hintsDisplay);
                }
            } else {
                // fallback: try to resolve from current selection
                const currentSystem = gameLibrary[currentSystemIdx];
                const selectedItem = displayedGamelistItems[currentGameIdx];
                const targetGame = selectedItem?.type === 'game' ? (selectedItem.game || currentSystem.games[selectedItem.origIndex]) : null;
                if (targetGame && (targetGame.core === "native_html" || targetGame.core === "ebooks")) {
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
        const isSearchFieldFocused = !!searchInput && (document.activeElement === searchInput || searchInput.contains(document.activeElement));
        if (isSearchFieldFocused) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSearchPanel();
            }
            return;
        }

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
        handlePointsCheatKey(rawKey);
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

    function handleUserInteraction({ unlockAudio = true } = {}) {
        if (!appActivated) {
            appActivated = true;
            startControllerPolling();
        }
        if (unlockAudio && !audioUnlocked) forceHardwareAudioWake();
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

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            toggleSearchPanel();
        });
    }

    if (searchCloseBtn) {
        searchCloseBtn.addEventListener('click', () => {
            closeSearchPanel();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const hadSearchQuery = gamelistSearchQuery.trim().length > 0;
            gamelistSearchQuery = event.target.value || '';
            if (gamelistSearchQuery.trim() && !hadSearchQuery) recordAchievementEvent('searchesUsed');
            refreshGamelistUI();
            if (displayedGamelistItems.length > 0) {
                updateGameSelection(0, false, false);
            } else {
                updateFavoriteButton(null);
                if (gameTitleElement) gameTitleElement.textContent = 'No matching game';
                if (counterDisplay) counterDisplay.textContent = '0 / 0';
            }
        });
    }

    if (searchScopeSelect) {
        searchScopeSelect.addEventListener('change', (event) => {
            gamelistSearchScope = event.target.value === 'all' ? 'all' : 'current';
            refreshGamelistUI();
            if (displayedGamelistItems.length > 0) {
                updateGameSelection(0, false, false);
            } else {
                updateFavoriteButton(null);
                if (gameTitleElement) gameTitleElement.textContent = 'No matching game';
                if (counterDisplay) counterDisplay.textContent = '0 / 0';
            }
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

    if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener('click', saveSettingsFromUI);
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

    if (lowPerformanceSwitch) {
        lowPerformanceSwitch.addEventListener('change', (event) => {
            arcadeSettings.lowPerformance = event.target.checked;
            persistArcadeSettings();
            applyLowPerformanceMode();
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

    if (favoriteGameBtn) {
        favoriteGameBtn.addEventListener('click', toggleFavoriteSelectedGame);
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

    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', () => {
            if (!isAccountSignedIn()) {
                openAccountPanel();
                setAccountStatus('Sign in to earn achievements and points.', 'error');
                return;
            }
            achievementsOverlay.hidden = false;
            renderAchievementsUI();
        });
    }

    if (achievementsCloseBtn) {
        achievementsCloseBtn.addEventListener('click', () => {
            achievementsOverlay.hidden = true;
        });
    }

    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            if (!isAccountSignedIn()) {
                openAccountPanel();
                setAccountStatus('Sign in to earn and spend points.', 'error');
                return;
            }
            shopOverlay.hidden = false;
            renderAchievementsUI();
        });
    }

    if (accountBtn) accountBtn.addEventListener('click', openAccountPanel);
    if (accountCloseBtn) accountCloseBtn.addEventListener('click', closeAccountPanel);
    if (accountPasswordForm) accountPasswordForm.addEventListener('submit', submitPasswordAuth);
    if (accountSignOutBtn) accountSignOutBtn.addEventListener('click', signOutAccount);
    if (accountModeToggle) {
        accountModeToggle.addEventListener('click', () => {
            accountMode = accountMode === 'signin' ? 'signup' : 'signin';
            renderAccountUI();
            accountUsernameInput.focus();
        });
    }
    if (accountOverlay) {
        accountOverlay.addEventListener('click', (event) => {
            if (event.target === accountOverlay) closeAccountPanel();
        });
    }

    if (shopCloseBtn) {
        shopCloseBtn.addEventListener('click', () => {
            shopOverlay.hidden = true;
        });
    }

    if (achievementShopList) {
        achievementShopList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-shop-id]');
            if (button) purchaseShopItem(button.dataset.shopId);
        });
        achievementShopList.addEventListener('change', (event) => {
            const toggle = event.target.closest('[data-shop-toggle]');
            if (toggle) setShopItemEnabled(toggle.dataset.shopToggle, toggle.checked);
        });
    }

    if (achievementsOverlay) {
        achievementsOverlay.addEventListener('click', (event) => {
            if (event.target === achievementsOverlay) achievementsOverlay.hidden = true;
        });
    }

    if (shopOverlay) {
        shopOverlay.addEventListener('click', (event) => {
            if (event.target === shopOverlay) shopOverlay.hidden = true;
        });
    }

    window.addEventListener('gamepadconnected', () => {
        handleUserInteraction({ unlockAudio: false });
        recordAchievementEvent('controllersConnected');
        if (controllerBindingsOverlay && !controllerBindingsOverlay.hidden) {
            updateBindingsUI();
        }
    });

    loadEntryUpdates();
    initializeAuth();
    handleAuthRedirectError();
    loadAchievements();
    applyPurchasedShopEffects();
    loadFlashKeyBindings();
    applySettingsToUI();
    updateCrtOverlayState();
    loadLibrary();
    updateBindingsUI();
    renderFlashBindingsUI();
    syncRuntimeButtonVisibility();
    window.addEventListener('arcade-session-state-changed', handleAchievementSessionChange);
    achievementSiteTimer = window.setInterval(() => {
        achievementState.stats.siteTimeSeconds = Math.max(0, Math.round((Date.now() - siteStartedAt) / 1000));
        evaluateAchievements();
    }, 60000);
})();

//thanks for looking at my code. if you want to make changes, please do not submit a pull request with bad changes. i will reject it. thanks. -Wesley (yes two reminders)
// Z-Z-ZZZAMNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNuh gng