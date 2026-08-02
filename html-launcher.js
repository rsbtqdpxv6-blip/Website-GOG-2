//= ==============================================================================
//           DIRECT-PATH ARCADE FILE INTERFACE ROUTER (EAGLERCRAFT FIX)
// ==============================================================================

/**
 * Initializes and embeds your unzipped HTML5 or MS-DOS game directories
 * by routing the iframe container straight to the pristine disk file URL track.
 */
function launchHtmlGame(game, hintsDisplay) {
    const emuOverlay = document.getElementById('emu-overlay');
    const iframe = document.getElementById('emu-sandbox-frame');
    if (!emuOverlay || !iframe) return;

    // Slide the presentation overlay screen into visibility
    emuOverlay.style.display = "block";
    if (hintsDisplay) {
        hintsDisplay.textContent = `Launching Native Application... Playing ${game.title || "Classic App"}`;
    }

    // Calculate the absolute file pathway trace cleanly to prevent local routing bugs
    const targetLaunchPath = new URL(game.rom_path, window.location.href).href;
    
    // --- THE DIRECT UN-ALTERED MOUNT ---
    // Force loading the clean local path directly into the frame window.
    // This allows Eaglercraft to calculate its relative folder asset packages perfectly,
    // stopping the raw text strings from leaking out onto the screen!
    iframe.src = targetLaunchPath;
    console.log("🚀 Direct hardware execution frame engaged targeting: " + targetLaunchPath);
}

/**
 * Cleanly terminates the active native session, unbinds content contexts,
 * and completely destroys running sandbox loops instantly.
 */
function closeHtmlGame(hintsDisplay) {
    const iframe = document.getElementById('emu-sandbox-frame');
    const emuOverlay = document.getElementById('emu-overlay');
    if (!iframe || !emuOverlay) return;

    // Forcing the document frame window to about:blank completely kills running JavaScript loops and sound
    iframe.src = "about:blank";
    emuOverlay.style.display = "none";

    if (hintsDisplay) {
        hintsDisplay.textContent = "Session terminated safely.";
    }
    console.log("Local application runtime context destroyed successfully.");
}
