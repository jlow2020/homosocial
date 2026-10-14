# homosocial.net

Season 0 site: landing page and application form. Next.js on Railway, applications and selfies stored in Supabase.

## Change Season details
Edit `src/lib/season.ts` (dates, spot count, area).

## Review applications
- Supabase > Table Editor > `applications`
- Selfies: Supabase > Storage > `selfies` (private)
- Set `status` to `approved` and that guy fills a seat in the homepage ring within a minute.

## Environment variables
See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is secret and server-only.

## Database
Run `supabase/schema.sql` once in Supabase > SQL Editor.
