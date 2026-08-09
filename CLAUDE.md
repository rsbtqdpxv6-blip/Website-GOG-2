\# 🕹️ Arcade Frontend Development Blueprint \& Expansion Guide



Developer guide for managing, running, and expanding the lightweight 3D Carousel Wheel \& Gamelist retro arcade dashboard workspace.



\---



\## 🛠️ Operational Toolkit Commands



\### 1. Synchronize \& Update Game Library Database

Regenerates `library.json` by running a local progressive word-matching scanner across folder trees.

```bash

run\_scraper.bat

```



\### 2. Purge Unmatched Ghost Artworks (after i sort everything out)

Scours your active art packs and securely erases dead image files that no longer correspond to a game inside `library.json`.

```bash

run\_cleanup.bat

```



\### 3. Compile Stylesheets

Re-renders responsive web engine variables from your source `.scss` into compiled hardware-accelerated tracking layers.

```bash

sass style.scss style.css

```



\---



\## 🧭 Navigational Interface Hotkeys



\### 🎡 System 3D Wheel Carousel State

\*   `◄` / `►` (or `A` / `D`) — Rotate Console Wheel selections

\*   `Enter` — Open current console's Gamelist Sidebar Pane

\*   `R` — 🎲 Attract Mode: Snap to a random hardware system lane



\### 📑 Two-Column Sidebar Gamelist State

\*   `▲` / `▼` (or `W` / `S`) — Scroll title rows cleanly with snappy grid positioning

\*   `◄` / `►` (or `A` / `D`) — Page Skip Jump (+/- 10 titles deep)

\*   `Enter` — Fire active Core Emulator Sandbox Window overlay or Web Game

\*   `Backspace` / `Escape` — Reverse back out to the main System 3D Wheel Stage

\*   `R` — 🎲 Attract Mode: Highlight a random game title row from your list instantly



\### 🎮 Live In-Game Session State

\*   `QUIT GAME Button (Top-Right)` — Forcefully collapses the sandbox frame, destroys runtime calculation loops, commits memory save states to browser-native Infinite IndexedDB storage, and completely silences sound processes.



\---



\## 📂 Concrete Directory Layout Examples



To add files correctly, follow these exact structure examples for console ROMs, unzipped DOS application folders, and standalone WebAssembly game wrappers:



\### Example A: Traditional Console Platform (NES / SNES / GBA)

Drop your standard raw ROM file directly into its platform directory. The progressive word matcher links the art automatically if it matches at least the first two words sequentially:

\*   `assets/roms/snes/Mega Man X (USA).sfc` (The ROM)

\*   `assets/roms/snes/boxart/Mega Man X.png` (The Artwork Match)



\### Example B: Classic PC Folder Platform (MS-DOS)

Every PC title requires its own unzipped loose subfolder. The python scraper scans the path and assigns execution boundaries to the first alphabetical `.exe` file it encounters:

\*   `assets/roms/dos/blood/` (The Game Directory)

\*   `assets/roms/dos/blood/BLOOD.EXE` (The Boot Executable Target)

\*   `assets/roms/dos/boxart/blood.png` (The Cover — \*Must match the folder name exactly!\*)



\### Example C: Standalone Web Player Platform (HTML5 / WASM-GC)

Modern browser-native ports must be fully packed single-file applications to avoid pathing or security header blockages:

\*   `assets/roms/html5/Eaglercraft/index.html` (The massive 30MB+ unified WASM-GC Minecraft bundle)

\*   `assets/roms/html5/boxart/Eaglercraft.png` (The Cover — \*Must match the folder name exactly!\*)



\### Example D: Secret Mixed Favorites Platform (`secret`)

The custom favorites tab accepts any console ROM types mixed together. The scraper reads the file extension strings to assign individual backend engine cores dynamically:

\*   `assets/roms/secret/Super Mario World.sfc` (Automatically assigns the `snes9x` core)

\*   `assets/roms/secret/Sonic the Hedgehog.md` (Automatically assigns the `genesis\_plus\_gx` core)

\*   `assets/roms/secret/boxart/Super Mario World.png` (The Associated Artwork)



\---



\## 🚀 Engine Architecture \& Feature Expansion Roadmap



To build advanced arcade functions onto this baseline platform, follow these technical implementation blueprints:



\### 1. Integrating Native USB Arcade Controller Mapping (Gamepad API)

To navigate your 3D wheels using physical arcade joysticks or controller decks, hook into the browser's native Gamepad processing layer inside `app.js`.



\*   \*\*Implementation Flow\*\*:

&#x20;   1. Set up a persistent `requestAnimationFrame` loop that poles `navigator.getGamepads()` whenever a gamepad event fires.

&#x20;   2. Monitor axis values (e.g., `gamepad.axes\[0] > 0.5` for Right) and button array indexes (e.g., `gamepad.buttons\[0].pressed` for Enter/A).

&#x20;   3. Apply a time-based debouncing gate threshold (approx 200ms) to ensure tapping a directional stick triggers exactly one clean incremental index transition instead of spinning out of control.



```javascript

// Development Blueprint Snippet

function pollArcadeControllerInput() {

&#x20;   const gamepads = navigator.getGamepads();

&#x20;   if (!gamepads\[0]) return requestAnimationFrame(pollArcadeControllerInput);

&#x20;   

&#x20;   const pad = gamepads\[0];

&#x20;   // Threshold debounce checks

&#x20;   if (pad.axes\[0] > 0.5 \&\& canNavigate) {

&#x20;       window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

&#x20;       triggerInputDebounceGate();

&#x20;   }

&#x20;   requestAnimationFrame(pollArcadeControllerInput);

}

window.addEventListener("gamepadconnected", () => pollArcadeControllerInput());

```



\### 2. Injecting a Post-Processing Retro CRT Monitor Shader (CSS/WebGL)

To give your modern widescreen layout or game sandbox frame an authentic vintage CRT monitor scanline glow, deploy a layered post-processing canvas or CSS filter layer inside `style.scss`.



\*   \*\*Implementation Flow\*\*:

&#x20;   1. Create an absolute-positioned overlay container element inside `index.html` stretching completely across the display viewport deck. Set `pointer-events: none` so it doesn't block layout click elements.

&#x20;   2. Apply a linear repeating background gradient filter inside Sass to emulate horizontal phosphor scanline masks.

&#x20;   3. Add a slight curved vignette box-shadow profile combined with a sub-pixel WebGL distortion canvas to recreate vintage rounded tube screen warps.



```scss

// CSS CRT Structural Blueprint Layer

.crt-scanline-matrix {

&#x20; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;

&#x20; background: repeating-linear-gradient(rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.3) 2px, transparent 4px);

&#x20; pointer-events: none; z-index: 999999;

&#x20; opacity: 0.4;

}

```



\### 3. Deploying an Interactive Global Search \& Text Filter Overlay

To instantly isolate individual game titles inside massive multi-hundred game listings, implement an asynchronous text-matching index engine.



\*   \*\*Implementation Flow\*\*:

&#x20;   1. Create a hidden text input field element inside `index.html` wrapped inside an overlay panel box context container.

&#x20;   2. Add an event listener mapping to an open key code trigger (like pressing `F` or `Space`). When fired, it shifts focus straight into the text layout input panel.

&#x20;   3. On every keystroke loop (`input` event tracking), run a `.filter()` loop across your active `gameLibrary\[currentSystemIdx].games` array block, executing `.toLowerCase().includes(searchQuery)` strings.

&#x20;   4. Force a clean re-render loop inside your sidebar container list through your existing `refreshGamelistUI()` function framework using the pruned data sub-array.



\---



