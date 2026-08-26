# EmulatorJS Netplay Server

This is the Socket.IO signaling server used by the local EmulatorJS Netplay client. It keeps room metadata in memory and relays WebRTC signaling and game messages. It does not relay gameplay media after the peer connection is established.

## Run locally

```powershell
cd netplay-server
npm install
npm start
```

The server listens on port `8080` by default. Set `PORT` when your hosting provider supplies a port. Set `FRONTEND_ORIGIN` to the exact website origin in production, for example:

```text
FRONTEND_ORIGIN=https://your-arcade-site.example
```

## Connect the website

Before `emulator-launcher.js` loads, configure the public server URL:

```html
<script>
  window.ARCADE_NETPLAY_SERVER = "https://your-netplay-server.example.com";
</script>
<script src="emulator-launcher.js" defer></script>
```

Use the HTTPS URL of the deployed service. Socket.IO will negotiate the secure WebSocket connection automatically.

## Hosting

Deploy this `netplay-server` folder to any Node.js host that supports long-lived WebSocket connections. The host must provide a persistent public HTTPS URL and must not sleep while players are connected. A small VPS, an always-on Raspberry Pi, or a cloud container are suitable. Static hosts such as GitHub Pages cannot run this server.

For players behind restrictive NATs, add a TURN server to the ICE list in `emulator-launcher.js`; Google STUN servers alone cannot guarantee a connection.
