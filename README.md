# homosocial.net

A reality show where you're the cast and there's no audience. Next.js on Railway, Supabase for auth, data and private photo storage.

## Flow
Sign in (email link) > profile > Realness Check (in-browser face match and liveness) > placed in a Circle.

## Season settings
`src/lib/season.ts`: season name, cast size (30), minimum to premiere (9), minimum age (21), episode list, and how zips group into regions.

## Environment variables
See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is secret and server-only.

## Database
`supabase/members.sql` creates circles, profiles, blocks, reports, the auto-pause trigger and the `place_member` placement function. `supabase/schema.sql` is the old application table and is no longer used.
