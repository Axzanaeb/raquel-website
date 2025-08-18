import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key for public read operations (RLS enforced). Fallback to service key ONLY if anon not set.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

let client = null;
if (supabaseUrl && anonKey) {
  try {
    client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  } catch (e) {
    console.error('[lesson-status] client init failed', e);
  }
}

export default async function handler(event) {
  const started = Date.now();
  function respond(statusCode, payload){
    return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
  }
  try {
    if(!client){
      console.error('[lesson-status] missing configuration');
      return respond(500, { error: 'Not configured' });
    }
    const slug = event.queryStringParameters?.slug;
    if(!slug) return respond(400, { error: 'Missing slug' });

    // Fetch capacity
    const { data: meta, error: metaError } = await client
      .from('lessons_public')
      .select('capacity')
      .eq('slug', slug)
      .maybeSingle();
    if(metaError) throw metaError;
    if(!meta) return respond(404, { error: 'Unknown lesson' });
    const capacity = (typeof meta.capacity === 'number') ? meta.capacity : null;

    // Count registrations via view (preferred) else fallback direct count
    let registered = 0;
    try {
      const { data: countRow, error: countErr } = await client
        .from('lesson_registrations_counts')
        .select('registrations')
        .eq('lesson_slug', slug)
        .maybeSingle();
      if(countErr) throw countErr;
      registered = countRow?.registrations || 0;
    } catch (inner) {
      console.warn('[lesson-status] counts view fallback', inner.message);
      const { count, error: directErr } = await client
        .from('lesson_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_slug', slug);
      if(directErr) throw directErr;
      registered = count || 0;
    }

    const remaining = (capacity !== null) ? Math.max(capacity - registered, 0) : null;
    return respond(200, { slug, capacity, registered, remaining, ms: Date.now()-started });
  } catch(err) {
    console.error('[lesson-status] error', err.message);
    return respond(500, { error: 'Server error' });
  }
}
