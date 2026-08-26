# Supabase username authentication

This is a custom username/password service. It does not use email or phone authentication.

1. Run `schema.sql` in Supabase SQL Editor.
2. Install the Supabase CLI and link this project.
3. Set the Edge Function secret:

```bash
supabase secrets set FRONTEND_ORIGIN=https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically by Supabase Edge Functions. Never put the service-role key in `auth-config.js`.

4. Deploy:

```bash
supabase functions deploy auth --no-verify-jwt
```

5. Update the root `auth-config.js` with:

```js
window.ARCADE_AUTH_CONFIG = {
    apiBaseUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth'
};
```