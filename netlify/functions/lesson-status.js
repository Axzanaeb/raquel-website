import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY; // secure (server only)

const client = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

export default async function handler(event, context) {
  try {
    const slug = event.queryStringParameters?.slug;
    const capacity = parseInt(event.queryStringParameters?.capacity || '0', 10);
    if(!slug) return { statusCode: 400, body: JSON.stringify({ error: 'Missing slug' }) };

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
