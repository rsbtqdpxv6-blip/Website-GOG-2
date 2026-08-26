# Cloudflare Netplay Service

This is a Cloudflare Workers + Durable Objects deployment for the existing EmulatorJS Netplay client. It provides the Socket.IO-compatible WebSocket packets, room listing, room creation, player updates, game-message relay, and WebRTC signaling relay.

## Deploy without a credit card

1. Create a Cloudflare account.
2. Install Node.js, then install Wrangler:

```powershell
cd netplay-cloudflare
npm install
npx wrangler login
```

3. Deploy:

```powershell
npm run deploy
```

Wrangler prints a URL such as `https://wesleys-games-netplay.<your-subdomain>.workers.dev`.

4. Put that URL into `netplay-config.js`:

```js
window.ARCADE_NETPLAY_SERVER = "https://wesleys-games-netplay.<your-subdomain>.workers.dev";
```

5. Redeploy your website.

The Worker Free plan and SQLite-backed Durable Objects include free usage quotas. Cloudflare account verification can vary by country, so it may still request verification for some accounts.

## Test

Open the deployed URL with `/health`, for example:

```text
https://your-worker.workers.dev/health
```

It should return `{ "ok": true }`.

This server only handles signaling and small room messages. Gameplay media travels through WebRTC. STUN is already configured in the frontend; TURN may be needed for restrictive networks.
