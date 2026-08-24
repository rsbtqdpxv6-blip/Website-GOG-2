# Wesley's Games auth server

This service provides username/password accounts for the static arcade frontend.

## Run locally

```powershell
cd auth-server
npm install
npm start
```

The API listens on `http://localhost:8787`. Set `apiBaseUrl` in the root `auth-config.js` to that URL.

For production, deploy this service on a Node host with HTTPS, set `COOKIE_SECURE=true`, set a real `FRONTEND_ORIGIN`, and use persistent storage/backups for `auth.sqlite`.
