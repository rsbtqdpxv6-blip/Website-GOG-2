# Supabase username authentication

This is a custom username/password service. It does not use email or phone authentication.

1. Run the complete `schema.sql` in Supabase SQL Editor. This includes the `arcade_site_effects` and `arcade_bans` tables required for site-wide effects and moderation. If the original schema was already run, run the new table, seed, and grant statements from that file again.
2. Install the Supabase CLI and link this project.
3. Set the Edge Function secret:

```bash
supabase secrets set FRONTEND_ORIGIN=https://rsbtqdpxv6-blip.github.io/Website-GOG-2
supabase secrets set ADMIN_USERNAMES=WesleyOfficial
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically by Supabase Edge Functions. Never put the service-role key in `auth-config.js`.

4. Deploy:

```bash
supabase functions deploy auth --no-verify-jwt
```

5. Update the root `auth-config.js` with:

```js
window.ARCADE_AUTH_CONFIG = {
    apiBaseUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1'
};
```