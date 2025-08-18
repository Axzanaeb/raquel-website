import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key for public read operations (RLS enforced). Fallback to service key ONLY if anon not set.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

let client = null;
try {
  if (supabaseUrl && anonKey) {
    client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }
} catch (e) {
  console.error('[lesson-status] client init failed', e);
}

// Helper to add timeout to a Supabase promise (network hangs can trigger Netlify 502)
async function withTimeout(promise, ms, label){
  let to; const timeout = new Promise((_, reject)=>{ to = setTimeout(()=>reject(new Error(label+':timeout')), ms); });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(to); }
}

export default async function handler(event) {
  const started = Date.now();
  function respond(statusCode, payload, extraHeaders){
    return { statusCode, headers: { 'Content-Type': 'application/json', ...(extraHeaders||{}) }, body: JSON.stringify(payload) };
  }
  try {
    if(!client){
      console.error('[lesson-status] missing configuration');
      return respond(500, { error: 'Not configured' }, { 'x-ls-state':'no-client' });
    }
    const slug = event.queryStringParameters?.slug;
    if(!slug) return respond(400, { error: 'Missing slug' });

    // Fetch capacity
    const { data: meta, error: metaError } = await withTimeout(
      client.from('lessons_public')
        .select('capacity')
        .eq('slug', slug)
        .maybeSingle(),
      3500,
      'capacity'
    );
    if(metaError) throw metaError;
    if(!meta) return respond(404, { error: 'Unknown lesson' }, { 'x-ls-state':'no-meta' });
    const capacity = (typeof meta.capacity === 'number') ? meta.capacity : null;

    // Count registrations via view (preferred) else fallback direct count
    let registered = 0;
    try {
      const { data: countRow, error: countErr } = await withTimeout(
        client.from('lesson_registrations_counts')
          .select('registrations')
          .eq('lesson_slug', slug)
          .maybeSingle(),
        3500,
        'counts'
      );
      if(countErr) throw countErr;
      registered = countRow?.registrations || 0;
    } catch (inner) {
      console.warn('[lesson-status] counts view fallback', inner.message);
      const { count, error: directErr } = await withTimeout(
        client
          .from('lesson_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('lesson_slug', slug),
        3500,
        'direct-count'
      );
      if(directErr) throw directErr;
      registered = count || 0;
    }

    const remaining = (capacity !== null) ? Math.max(capacity - registered, 0) : null;
    return respond(200, { slug, capacity, registered, remaining, ms: Date.now()-started }, { 'x-ls-state':'ok' });
  } catch(err) {
    console.error('[lesson-status] error', err.message);
    return respond(500, { error: 'Server error' }, { 'x-ls-state':'error' });
  }
}
