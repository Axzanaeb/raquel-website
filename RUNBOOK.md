## Runbook

### Deploy
1. Commit & push to `main`.
2. Netlify builds and deploys automatically.

### Rotate Supabase Keys
1. In Supabase: regenerate anon & service keys.
2. Update Netlify env vars `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
3. Trigger redeploy.

### Restore Database
1. Identify backup (automated or manual pg_dump).
2. Use Supabase SQL editor or psql: `psql < backup.sql` (ensure downtime window).
3. Re-run schema migrations in `supabase/schema.sql` if needed.

### Investigate Registration Issue
1. Check `/admin-function-logs`.
2. Filter by `register-lesson`.
3. If repeated failures, view Netlify function logs and Supabase logs.

### Enable Logging
Set `ENABLE_FUNCTION_LOGS=1` in Netlify environment and redeploy.

### Add New Lesson Capacity Enforcement
1. (Future) Ensure capacity persisted in DB or derived view.
2. Update `register-lesson` to read capacity server-side.

### Backup Strategy (Recommended)
Daily automated backup via Supabase (configure in dashboard). Monthly manual export of `lesson_registrations` to secure storage.

### Rollback
1. In Netlify UI, select previous successful deploy and click Rollback.
2. If DB changes involved, restore prior DB snapshot.

### Add Analytics Provider
1. Set fields in CMS Settings (provider, script src, domain).
2. Adjust CSP if new domain (edit `netlify.toml`).

### Contact / Ownership
Admin manages content; developer only for structural changes or security upgrades.
