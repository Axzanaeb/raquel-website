# Admin Guide

## Logging In
1. Visit `/admin/` on the live site.
2. Use Netlify Identity (Sign up first if invited, then verify email).
3. An existing admin must assign you the `admin` role in Netlify dashboard for registrations view.

## Managing Content
- **Artworks**: Add via *Artworks* collection. Provide title, category, image, date.
- **Lessons**: Add in *Lessons* collection. Capacity determines max registrations.
- **Pages**: Edit About & Contact.
- **Settings**: Update global site fields, social links, OG image.

## Lesson Registrations
- Go to `/admin/registrations/` while logged in.
- Use filter box to narrow by lesson slug (filename without extension).
- Export: Copy table into a spreadsheet manually (future automation optional) or use the CSV export endpoint.

## Image Guidelines
- Upload JPG or PNG. Recommended widths: 1600px max. System auto-generates optimized formats.
- For OG image use 1200x630.

## Booking Flow
1. Visitor fills form under a lesson.
2. If seats remain (capacity not exceeded), registration stored.
3. Admin contacts participants manually (email) for confirmation.
4. Reduce capacity by editing lesson if you want to close early (set to 0 or unpublish file).

## Updating Site Settings
- Title, Tagline, Description appear in metadata.
- `Site URL` should be full (https://example.com) for sitemap & social cards.

## Cleanup Performed
- Sample functions now use the Supabase anon key (RLS enforced) for public endpoints.
- Retain only real content; remove placeholder markdown via the CMS when no longer needed.

## Security (Row Level Security)
Public endpoints use the anon key so RLS policies apply. Admin endpoints still use service key and verify `admin` role.
If adding a new public table, ensure you:
1. Enable RLS: `alter table <table> enable row level security;`
2. Add policies permitting required actions.

## Do Not
- Expose Supabase service key publicly.
- Commit secrets to repository.

## Support
Contact developer for structural changes only. Routine operations can be done inside the CMS.
