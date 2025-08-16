import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key for public read operations (RLS enforced). Fallback to service key ONLY if anon not set.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

export default async function handler(event, context) {
  try {
    const slug = event.queryStringParameters?.slug;
  const capacityParam = event.queryStringParameters?.capacity;
  const capacity = capacityParam ? parseInt(capacityParam, 10) : null;
  if(!slug) return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug' }) };

    // Query the counts view (granted to anon) instead of base table
  const { data, error } = await client.from('lesson_registrations_counts').select('registrations').eq('lesson_slug', slug).maybeSingle();

    if(error) throw error;
    const registered = data?.registrations || 0;

  const remaining = (typeof capacity === 'number') ? Math.max(capacity - registered, 0) : null;
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, capacity, registered, remaining }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
