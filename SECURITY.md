## Security Overview

Components:
- Netlify Identity for auth (role: `admin`).
- Supabase Postgres with RLS on `lesson_registrations`.
- Public anon key used for inserts; service key only in admin/serverless context.

Policies:
- Insert open (anyone) on `lesson_registrations`.
- Select restricted to admins; public counts via `lesson_registrations_counts` view.

Data:
- Emails stored in plain text plus SHA-256 hash (`email_hash`). Plan: migrate to hash-only if desired.

Secrets Handling:
- All secrets via Netlify environment variables (never committed).
- Rotate keys in Supabase dashboard; update Netlify env; redeploy.

CSP:
- Global CSP defined in `netlify.toml`. Inline scripts removed (theme) to enable future removal of `'unsafe-inline'`.

Reporting:
- Function attempts logged to `function_logs` (admin-only select). Add alerting later.

Known Improvements:
- Implement lessons_public view for slug validation at DB level.
- Replace inline remaining scripts; add nonce-based CSP.
