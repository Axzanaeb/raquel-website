import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key for public read operations (RLS enforced). Fallback to service key ONLY if anon not set.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

export default async function handler(event, context) {
  try {
    const slug = event.queryStringParameters?.slug;
    const capacity = parseInt(event.queryStringParameters?.capacity || '0', 10);
    if(!slug) return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug' }) };

    // Only need count; RLS policy should allow select count on lesson_registrations
    const { count, error } = await client
      .from('lesson_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_slug', slug);

    if(error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, capacity, registered: count || 0, remaining: Math.max(capacity - (count || 0), 0) })
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
