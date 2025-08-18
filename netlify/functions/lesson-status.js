import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key for public read operations (RLS enforced). Fallback to service key ONLY if anon not set.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

export default async function handler(event, context) {
  try {
    const slug = event.queryStringParameters?.slug;
    if(!slug) return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug' }) };
    // Authoritative capacity from lessons_public
    const { data: meta, error: metaError } = await client
      .from('lessons_public')
      .select('capacity')
      .eq('slug', slug)
      .maybeSingle();
    if(metaError) throw metaError;
    if(!meta) return { statusCode: 404, body: JSON.stringify({ error: 'Unknown lesson' }) };
    const capacity = typeof meta.capacity === 'number' ? meta.capacity : null;

    // Query the counts view (granted to anon) instead of base table
  const { data, error } = await client.from('lesson_registrations_counts').select('registrations').eq('lesson_slug', slug).maybeSingle();

    if(error) throw error;
    const registered = data?.registrations || 0;

  const remaining = (capacity !== null) ? Math.max(capacity - registered, 0) : null;
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, capacity, registered, remaining }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
