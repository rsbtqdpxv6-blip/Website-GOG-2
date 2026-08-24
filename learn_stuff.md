# Explained Code

This document describes the first-party code in this repository. The project is a static browser arcade frontend: the browser loads `index.html`, the application reads `library.json`, and games are opened in an iframe using either EmulatorJS, Ruffle, or a native HTML game page.

## Runtime Architecture

```text
index.html
  -> style.css
  -> coi-serviceworker.js
  -> emulator-launcher.js
  -> html-launcher.js
  -> app.js
       -> library.json
       -> settings.json
       -> achievements.json
       -> localStorage
       -> IndexedDB (ArcadeInfiniteSaves)
```

### `index.html`

The HTML file owns the page structure and stable element IDs. JavaScript fills dynamic regions after the document loads.

- `#entry-screen`: initial user gesture used to unlock browser audio.
- `#wheel-stage` and `#carousel-view`: 3D system selector.
- `#gamelist-view`: game list, folder navigation, fanart, box art, and description.
- `#achievements-overlay`: achievement progress and point summary.
- `#shop-overlay`: shop purchases and switches for owned easter eggs.
- `#settings-overlay`: emulator, CRT, low-performance, and per-system settings.
- `#emu-overlay` and `#emu-sandbox-frame`: full-screen game runtime.
- `#crt-overlay`: optional CRT visual layer.
- `#shop-confetti-overlay`: configurable GIF celebration layer above the game runtime.

The script order matters. Launchers define functions used by `app.js`, so they are loaded first.

## Application Controller: `app.js`

`app.js` is wrapped in an immediately invoked function expression. This keeps application state private and exposes behavior through DOM events and custom events instead of global variables.

### Main state

- `gameLibrary`: systems and games loaded from `library.json`.
- `currentSystemIdx`: selected system index in `gameLibrary`.
- `currentGameIdx`: selected visible item in the current game list.
- `currentViewMode`: either `WHEEL` or `GAMELIST`.
- `gamelistFolderStack`: folder path used for nested game folders.
- `displayedGamelistItems`: the currently rendered folders and games.
- `carouselCards` and `gameRowItems`: references to rendered DOM items.
- `arcadeSettings`: settings loaded from `settings.json` and localStorage.
- `favoriteGameIds`: game IDs stored as favorites.
- `achievementState`: persistent achievement statistics, points, purchases, and enabled shop items.

### View flow

1. `loadLibrary()` loads settings and the game library.
2. `renderWheel()` creates one card per visible system.
3. `updateWheelSelection()` owns all 3D card transforms and header/background updates.
4. `enterGamelist()` resets folder navigation and switches to the list view.
5. `buildGamelistItems()` derives visible folders and games from ROM paths.
6. `refreshGamelistUI()` renders the list.
7. `updateGameSelection()` updates focus and preview metadata.
8. `setViewMode()` toggles the active view without destroying the other view.

The system wheel uses these constants:

- `theta`: side-card rotation angle.
- `radius`: 3D depth of cards.
- `flatCardSpacing`: horizontal spacing between cards.

Keep the transform calculations in `updateWheelSelection()` and the 3D CSS in `.wheel-stage`; those two pieces are intentionally coupled.

### Input flow

Keyboard input is handled by the document-level `keydown` listener. It first gives priority to search fields, binding capture, Flash runtime bindings, and an active emulator. Normal keys are converted through `wheelKeyMap` or `gamelistKeyMap`, then sent to `dispatchInputAction()`.

Gamepad input is polled after the entry screen is activated. `getControllerProfile()` identifies common controller families, `controllerBindings` maps actions to button indexes, and `dispatchInputAction()` reuses the same navigation path as the keyboard.

### Game launch flow

`dispatchInputAction('select')` resolves the focused game and calls one launcher:

- `launchGame()` for EmulatorJS and Ruffle games.
- `launchHtmlGame()` for native HTML games.

Both launchers dispatch `arcade-session-state-changed` with `{ detail: { game } }` on start. Closing dispatches the same event with `game: null`. The achievement tracker listens to this event, so both runtime types produce the same statistics.

## Achievements and Points

### `achievements.json`

The file contains two arrays:

```json
{
  "version": 1,
  "achievements": [],
  "shop": []
}
```

Achievement fields:

- `id`: stable unique identifier.
- `title`: display name.
- `description`: requirement text.
- `icon`: short display marker.
- `type`: `stat`, `system`, `core`, `game`, `uniqueSystems`, or `allSystems`.
- `stat`: counter used by the achievement.
- `target`: required value.
- `points`: points awarded once when unlocked.
- `system`, `core`, or `gameTitle`: optional scope field for scoped achievements.

Shop fields:

- `id`: stable unique identifier.
- `title` and `description`: display content.
- `icon`: short display marker.
- `cost`: points required to purchase.
- `effect`: effect name used as documentation and a future extension point.

### Achievement storage

The key `arcadeAchievements` stores:

- `unlocked`: map of achievement ID to unlock timestamp.
- `stats`: global counters such as launches, play time, searches, and random picks.
- `systemStats`, `coreStats`, and `gameStats`: scoped counters.
- `playedSystems`: unique system IDs used for collection goals.
- `bonusPoints`: points from qualifying game sessions and secrets.
- `purchasedShopItems`: permanent shop ownership.
- `enabledShopItems`: currently active purchased effects.
- `pointsCheatClaimed`: one-time `2-0-1-5-B` wheel secret.

A game session adds 2 bonus points only when it lasts at least 60 seconds. Closing and reopening starts a new timer, so short sessions cannot farm points.

`getAchievementPoints()` computes earned achievement points plus session/secret bonus points. `getAvailableAchievementPoints()` subtracts the cost of owned shop items. This makes purchases persistent without duplicating currency.

### Adding an achievement

Add one object to the `achievements` array. No JavaScript change is needed for the supported types. For example:

```json
{
  "id": "play-ten-gb-games",
  "title": "Pocket Marathon",
  "description": "Play 10 Game Boy games.",
  "icon": "GB",
  "type": "system",
  "system": "gb",
  "stat": "gamesStarted",
  "target": 10,
  "points": 30
}
```

### Adding a shop item

Add an object to `shop`. For effects that need code, add the item ID to `applyPurchasedShopEffects()` and use the enabled list, not the purchased list. Ownership and activation are deliberately separate.

```json
{
  "id": "example-effect",
  "title": "Example Cabinet Effect",
  "description": "A short description of the easter egg.",
  "icon": "E",
  "cost": 40,
  "effect": "exampleEffect"
}
```

## Settings

`settings.json` provides defaults. User overrides are stored under `arcadeSettings` in localStorage.

- `threadedCores`: passes the EmulatorJS threading preference to the sandbox.
- `crtEnabled`: enables the CRT overlay and canvas animation.
- `lowPerformance`: removes costly filters and transitions, throttles gamepad polling, enables list containment, and suspends CRT rendering.
- `systems`: per-system background and emulator core overrides.

When adding a setting, update all four locations: `settings.json`, the default object in `app.js`, `loadArcadeSettings()`, and the settings UI/save handler in `index.html` and `app.js`.

## Launchers

### `emulator-launcher.js`

- `getCleanGameToken()`: creates a stable save-state key from a ROM path.
- `openArcadeIndexedDB()`: opens the `ArcadeInfiniteSaves` database and creates `game_save_states`.
- `launchGame()`: creates the sandbox document, configures Ruffle or EmulatorJS, and restores save state data.
- `handleIncomingParentMessages()`: receives emulator readiness and save-state payloads.
- `closeGameWithSave()`: asks EmulatorJS to serialize state before closing.
- `finalizeArcadeClosure()`: clears the iframe and broadcasts the session end event.

### `html-launcher.js`

- `launchHtmlGame()`: loads a browser-native game into the shared iframe.
- `closeHtmlGame()`: clears the iframe and broadcasts the session end event.

Both launchers use the shared `#emu-overlay` so the rest of the application can treat every game runtime consistently.

## Data Generation Utilities

### `generate_library.py`

Scans `assets/roms`, identifies systems and games, assigns sequential numeric IDs in case-insensitive alphabetical display-title order, matches box art, loads descriptions, and writes `library.json`. IDs start at 1 for each complete scrape and are unique across the generated library. `CORE_MAP`, `EXTENSION_CORE_MAP`, `TITLE_MAP`, and `BACKGROUND_MAP` are the primary configuration tables.

Run it with `run_scraper.bat`.

### `cleanup_boxart.py`

Reads `library.json`, builds a set of referenced box-art paths, then removes unmatched image files from system `boxart` folders. Run it only after the library and artwork have been checked.

Run it with `run_cleanup.bat`.

### `convert_png_to_webp.py`

Converts PNG artwork to WebP where configured. This is an asset utility and does not participate in browser runtime behavior.

### `descmaker/desc_maker.py`

Creates or processes game description files used by the library generator. (Use Skraper)

## Styling: `style.scss` and `style.css`

`style.scss` is the editable source. `style.css` is the browser-loaded output.

Compile after SCSS changes:

```text
sass style.scss style.css
I use a SCSS extension in VS code
```

Important style ownership:

- `.wheel-stage` owns the 3D scene.
- `.gamelist-view` owns the two-column list layout.
- `.controller-bindings-overlay` is shared by settings, bindings, achievements, and shop dialogs.
- `.low-performance-mode` is the performance override layer.
- `#shop-confetti-overlay` is the topmost pointer-transparent GIF layer.

## Service Worker and Vendor Runtime Files

`coi-serviceworker.js` provides the cross-origin isolation behavior needed by threaded emulator cores.

The files under `emulatorjs/`, `ruffle/`, and packaged games under `assets/roms/` are third-party or bundled runtime code. They are intentionally not reformatted or line-commented. Their upstream documentation and licenses should be consulted when changing those files.

## Safe Change Checklist

1. Preserve stable DOM IDs used by `app.js`.
2. Keep `library.json`, `settings.json`, and `achievements.json` valid JSON.
3. Compile `style.scss` into `style.css` after stylesheet changes.
4. Run `node --check app.js`, `node --check emulator-launcher.js`, and `node --check html-launcher.js` after JavaScript changes. (just to be safe)
5. Test wheel navigation, game-list navigation, launch/close, achievements, shop switches, and backup/restore after cross-cutting changes.
6. Do not edit generated emulator or packaged-game files for application-level changes.
