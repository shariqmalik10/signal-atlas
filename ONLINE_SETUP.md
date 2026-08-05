# Signal Atlas — online persistence setup

The public directory is static-first and reads additions from Supabase when it is configured. The `/manage` route is intentionally separate from browsing and uses passwordless magic-link auth; only listed administrators can write.

## 1. Create the database

1. Create a [Supabase](https://supabase.com) project.
2. In **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Authentication → URL Configuration**, add the deployed `/manage` URL to redirect URLs. For local development add `http://127.0.0.1:4173/manage`.

## 2. Configure the public app

Copy `.env.example` to `.env.local` and use the project **URL** and browser-safe **anon key** from Project Settings → API:

```sh
cp .env.example .env.local
```

`VITE_SUPABASE_ANON_KEY` is intended for browser use. Do **not** put a service-role key in `.env.local`, source code, Git, or a deployment's public environment.

## 3. Migrate the existing directory once

The seed script imports all original, deduplicated catalog entries with their citations. Use a service-role key only in this one server-side shell command:

```sh
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
node scripts/seed-supabase.mjs
```

The script is idempotent by canonical URL (`upsert … onConflict: url`), so it is safe to run again after the catalog changes.

## 4. Grant portal access

1. Open `/manage` after the public app has been deployed and request a magic link for your own email.
2. Then in Supabase SQL Editor, run this once with your email:

```sql
insert into public.atlas_admins (user_id)
select id from auth.users where email = 'you@example.com';
```

Public visitors can read the shared directory. The Row Level Security policies in `supabase/schema.sql` only permit rows in `atlas_admins` to insert, update, or delete link records.

## 5. Deploy

Deploy the Vite application to any SPA-capable host (for example Vercel, Netlify, or Cloudflare Pages) and configure a rewrite/fallback so `/manage` serves `index.html`. Add the two `VITE_SUPABASE_*` variables to the host's build environment.
