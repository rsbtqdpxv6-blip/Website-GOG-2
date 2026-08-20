//EVERYTHINGS IN ASSETS FOLDER, SO IF YOU WANT TO CHANGE ANYTHING, GO THERE. (I will add more stuff to the assets folder later, but for now, this is all you need to know)
//native html (web browser should handle this easily (unless CORS (cors hates sandboxed stuff) is in the game, then it will not work, but I will try to fix that later))
function launchHtmlGame(game, hintsDisplay) {
    const emuOverlay = document.getElementById('emu-overlay');
    const iframe = document.getElementById('emu-sandbox-frame');
    if (!emuOverlay || !iframe) return;

    emuOverlay.style.display = "block";
    if (hintsDisplay) {
        hintsDisplay.textContent = `Launching Native Application... Playing ${game.title || "Classic App"}`;
    }

    // Calculate the absolute file pathway trace cleanly to prevent local routing bugs
    const targetLaunchPath = new URL(game.rom_path, window.location.href).href;
    
    iframe.src = targetLaunchPath;
    console.log("🚀 Direct hardware execution frame engaged targeting: " + targetLaunchPath);
}

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
