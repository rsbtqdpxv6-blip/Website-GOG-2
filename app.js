// ==============================================================================
//                    UNIFIED APPLICATION CONTROLLER (PART 1)
// ==============================================================================
(() => { // Safely wrapped inside a private block scope to block double-loads
    let gameLibrary = [];
    let currentSystemIdx = 0;
    let currentGameIdx = 0;
    let currentViewMode = "WHEEL"; 

    const theta = 35; // 3D cylinder step separation angle
    const radius = 380; // 3D cylinder pushing depth parameter
    const flatCardSpacing = 340; // Flat horizontal spacing distance for wide logos

    // Centralized audio allocation nodes
    const soundScroll = new Audio('assets/sound/scroll.wav');
    const soundSelect = new Audio('assets/sound/select.wav');
    const soundLaunch = new Audio('assets/sound/launch.wav');
    const soundBack   = new Audio('assets/sound/back.wav');

    function playArcadeSound(audioObject) {
        try {
            audioObject.currentTime = 0; 
            audioObject.play();
        } catch (soundError) {
            console.warn("Audio Context playback exception:", soundError);
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
        if (hintsDisplay) hintsDisplay.textContent = "◄ ► Select System • Enter to Open Menu";
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
        
        // Clean out override selectors so everything reads the fluid layout
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
            // Native zero-lag snap offloads animation loops to prevent memory crashes
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
        if (hintsDisplay) hintsDisplay.textContent = "▲ ▼ Scroll • ◄ ► Page Jump (+/- 10) • Enter to Start • Backspace to Go Back";
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
        if (emuOverlay && emuOverlay.style.display === "block") return; 
        
        if (currentViewMode === "WHEEL") {
            if (e.key === 'ArrowRight' || e.key === 'D' || e.key === 'd') {
                if (currentSystemIdx < gameLibrary.length - 1) updateWheelSelection(currentSystemIdx + 1, true);
            } else if (e.key === 'ArrowLeft' || e.key === 'A' || e.key === 'a') {
                if (currentSystemIdx > 0) updateWheelSelection(currentSystemIdx - 1, true);
            } else if (e.key === 'Enter') {
                enterGamelist();
            }
        } 
        else if (currentViewMode === "GAMELIST") {
            const totalGames = gameLibrary[currentSystemIdx]?.games?.length || 0;
            if (totalGames === 0) {
                if (e.key === 'Backspace' || e.key === 'Escape') setViewMode("WHEEL");
                return;
            }
            
            if (e.key === 'ArrowDown' || e.key === 'S' || e.key === 's') {
                e.preventDefault();
                if (currentGameIdx < totalGames - 1) {
                    updateGameSelection(currentGameIdx + 1, true);
                } else {
                    updateGameSelection(0, true); 
                }
            } else if (e.key === 'ArrowUp' || e.key === 'W' || e.key === 'w') {
                e.preventDefault();
                if (currentGameIdx > 0) {
                    updateGameSelection(currentGameIdx - 1, true);
                } else {
                    updateGameSelection(totalGames - 1, true); 
                }
            } 
            else if (e.key === 'ArrowRight' || e.key === 'D' || e.key === 'd') {
                e.preventDefault();
                let targetIdx = Math.min(currentGameIdx + 10, totalGames - 1);
                updateGameSelection(targetIdx, true);
            } else if (e.key === 'ArrowLeft' || e.key === 'A' || e.key === 'a') {
                e.preventDefault();
                let targetIdx = Math.max(currentGameIdx - 10, 0);
                updateGameSelection(targetIdx, true);
            } 
            else if (e.key === 'Enter') {
                const selectedGame = gameLibrary[currentSystemIdx]?.games?.[currentGameIdx];
                if (!selectedGame) return;
                
                playArcadeSound(soundLaunch); 
                if (selectedGame.core === "native_html") {
                    launchHtmlGame(selectedGame, hintsDisplay);
                } else {
                    launchGame(selectedGame, hintsDisplay);
                }
            } else if (e.key === 'Backspace' || e.key === 'Escape') {
                e.preventDefault();
                playArcadeSound(soundBack); 
                setViewMode("WHEEL");
            }
        }
    });

    loadLibrary();
})(); // End protected scope enclosure closure loop block safely
