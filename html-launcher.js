// ==============================================================================
//                    UNIFIED APPLICATION CONTROLLER (PART 1)
// ==============================================================================
let gameLibrary = [];
let currentSystemIdx = 0;
let currentGameIdx = 0;
let currentViewMode = "WHEEL"; 

const theta = 35; // Kept at your original 3D angle parameter
const radius = 380; // Kept at your original 3D radius parameter
const flatCardSpacing = 340; // Pushes cards sideways to clear widescreen boundaries cleanly

// --- CENTRALIZED ARCADE AUDIO CAPTURE POOLS ---
const soundScroll = new Audio('assets/sound/scroll.wav');
const soundSelect = new Audio('assets/sound/select.wav');
const soundLaunch = new Audio('assets/sound/launch.wav');
const soundBack   = new Audio('assets/sound/back.wav');

function playArcadeSound(audioObject) {
    try {
        audioObject.currentTime = 0; 
        audioObject.play();
    } catch (soundError) {
        console.warn("Audio context playback intercept:", soundError);
    }
}

// DOM Element Targets
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
        hintsDisplay.textContent = "Error parsing default library data models.";
    }
}

function renderWheel() {
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
    systemDisplay.textContent = data.title.toUpperCase();
    counterDisplay.textContent = `${currentSystemIdx + 1} / ${gameLibrary.length}`;
    hintsDisplay.textContent = "◄ ► Select System • Enter to Open Menu";
    document.body.style.setProperty('--system-bg', `url('assets/backgrounds/${data.system}.jpg')`);
}
