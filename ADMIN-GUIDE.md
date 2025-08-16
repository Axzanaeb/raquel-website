# Admin Guide

## Logging In
1. Visit `/admin/` on the live site.
2. Use Netlify Identity (Sign up first if invited, then verify email).
3. An existing admin must assign you the `admin` role in Netlify dashboard for registrations view.

## Managing Content
- **Artworks**: Add via *Artworks* collection. Provide title, category, image, date.
- **Lessons**: Add in *Lessons* collection. Capacity determines max registrations.
- **Pages**: Edit About, Contact, 404.
- **Settings**: Update global site fields, social links, OG image, hero content, hero images, analytics settings.

## Gallery Features
- Lightbox with keyboard & focus trap accessibility.
- Pagination: "Load More" for performance.

## Dark Mode
Toggle in site header. Preference saved locally.

## Lesson Registrations
- URL: `/admin/registrations/` (must be admin).
- Filters: slug + date range.
- Mask Emails, Unique Emails extraction, CSV export.
- Duplicate signup returns clear message (Already registered).

## Registration Emails (Optional)
Requires `RESEND_API_KEY` & `RESEND_FROM`. Admin notifications go to `ADMIN_NOTIFY_EMAIL` if set.

## Spam & Abuse Protection
Honeypot + rate limiting + slug validation (via `lessons_public` view) + duplicate constraint.

## Image Optimization
Responsive images + blur-up placeholder. Upload ≤1600px width.

## SEO & Feeds
JSON-LD (Organization & Events) + RSS `/feed.xml`.

## Analytics (Optional)
Configure provider/script in Site Settings (e.g. Plausible). CSP already allows plausible.io.

## Logging
Function attempts stored in `function_logs` when `ENABLE_FUNCTION_LOGS` and service key present. View via `/admin-function-logs` (filter & CSV) or Supabase SQL.
Static assets & images now served with long-term immutable caching headers.

## Security (RLS)
Anon key for public inserts; admin endpoints use service key + role check. Counts now via `lesson_registrations_counts` view. Public lessons metadata via `lessons_public` view.

## Accessibility
Lightbox: ESC to close, focus trapped. Alt text now configurable per artwork (provide meaningful description). Continue auditing color contrast for future improvements.

## Backups
Schedule Supabase backups (dashboard) and optionally export `lesson_registrations` monthly.

## Do Not
Expose service key or commit secrets.

## Future Ideas
Waitlist, iCal attachments, automated failure alerts.

## Support
Contact developer for structural changes only.

## CI / Validation
A `npm run validate` script checks for broken internal links after build.
