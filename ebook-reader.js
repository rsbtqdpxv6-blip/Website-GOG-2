// Ebook reader for local PDF and EPUB files.
function launchEbook(game, hintsDisplay) {
    const emuOverlay = document.getElementById('emu-overlay');
    const iframe = document.getElementById('emu-sandbox-frame');
    if (!emuOverlay || !iframe) return;

    emuOverlay.style.display = "block";
    window.__arcadeActiveRuntimeGame = game;
    window.dispatchEvent(new CustomEvent('arcade-session-state-changed', { detail: { game } }));
    const targetPath = new URL(game.rom_path, window.location.href).href;

    if (!targetPath.toLowerCase().endsWith('.epub')) {
        iframe.src = targetPath;
        if (hintsDisplay) hintsDisplay.textContent = `Opening ${game.title || "ebook"}...`;
        return;
    }

    const ebookUrl = JSON.stringify(targetPath);
    iframe.srcdoc = `
        <!doctype html>
        <html><head><meta charset="utf-8"><style>
            html, body { margin: 0; height: 100%; background: #202124; color: #f5f1e8; font: 16px system-ui, sans-serif; }
            #toolbar { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #111; }
            #reader { height: calc(100% - 48px); background: #f5f1e8; }
            button { padding: 8px 14px; cursor: pointer; }
        </style><script src="epub.min.js"></script></head>
        <body><div id="toolbar"><button id="previous">Previous</button><span id="status">Loading ebook...</span><button id="next">Next</button></div><div id="reader"></div>
        <script>
            const book = ePub(${ebookUrl});
            const rendition = book.renderTo('reader', { width: '100%', height: '100%' });
            rendition.display();
            document.getElementById('previous').onclick = () => rendition.prev();
            document.getElementById('next').onclick = () => rendition.next();
            book.ready.then(() => document.getElementById('status').textContent = book.package.metadata.title || 'Ebook');
        </script></body></html>`;
    if (hintsDisplay) hintsDisplay.textContent = `Opening ${game.title || "ebook"}...`;
}
