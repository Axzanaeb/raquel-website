# Admin Guide

## Logging In
1. Visit `/admin/` on the live site.
2. Use Netlify Identity (Sign up first if invited, then verify email).
3. An existing admin must assign you the `admin` role in Netlify dashboard for registrations view.

## Managing Content
- **Artworks**: Add via *Artworks* collection. Provide title, category, image, date.
- **Lessons**: Add in *Lessons* collection. Capacity determines max registrations.
- **Pages**: Edit About, Contact, 404.
- **Settings**: Update global site fields, social links, OG image, hero content, hero images.

## Gallery Features
- Lightbox: Click any artwork to open a larger view.
- Pagination: "Load More" loads additional artworks; initial load keeps page fast.

## Dark Mode
- Toggle in site header. Preference stored locally per browser.

## Lesson Registrations
- Go to `/admin/registrations/` while logged in.
- Filters: By slug (partial match) and date range (client-side).
- Mask Emails: Toggle to obscure participant emails when screen sharing.
- Unique Emails: Button extracts a deduplicated list for mailing tools.
- Auto-Refresh: Page refreshes data periodically (can disable by pausing the tab).
- CSV Export: Use on-page CSV export or `/api/admin/export-registrations` endpoint.

## Registration Emails (Optional)
If `RESEND_API_KEY` & `RESEND_FROM` env vars set:
- User receives confirmation email per registration.
- Admin notification sent to `ADMIN_NOTIFY_EMAIL` if configured.

## Spam & Abuse Protection
- Honeypot input (hidden) plus name length check.
- Rate limiting: Max 5 attempts per 10 minutes per IP+lesson.
- Slug validation (if `lessons_public` view exists) blocks bogus lesson names.

## Image Optimization
- Responsive images generated automatically.
- Blur-up tiny placeholder (24px) improves perceived load.
- Recommended max width upload: 1600px.

## SEO & Feeds
- JSON-LD Organization + Event schema embedded.
- RSS feed at `/feed.xml` (recent artworks & lessons).

## Updating Site Settings
- Title, Tagline, Description appear in metadata.
- `Site URL` should be full (`https://example.com`) for sitemap/social cards.

## Security (Row Level Security)
Public endpoints use the anon key so RLS policies apply. Admin endpoints still use service key and verify `admin` role.
If adding a new public table:
1. Enable RLS: `alter table <table> enable row level security;`
2. Add policies permitting required actions.

Counts Endpoint now reads from `lesson_registrations_counts` view (no PII exposure).

## Do Not
- Expose Supabase service key publicly.
- Commit secrets to repository.

## Optional Next Enhancements
- Add analytics (e.g. Plausible) – adjust CSP `script-src`.
- Add structured logging table for function attempts (currently console only when `ENABLE_FUNCTION_LOGS` set).

## Support
Contact developer for structural changes only. Routine operations can be done inside the CMS.
