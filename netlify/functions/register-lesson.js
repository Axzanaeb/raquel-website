import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key; RLS policy must allow insert on lesson_registrations. Service key not needed for public.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

// In-memory rate limiter (ephemeral per function container)
const attempts = new Map();
const WINDOW_MS = 1000 * 60 * 10; // 10 minutes
const MAX_PER_WINDOW = 5;

function rateKey(ip, slug){
  return `${ip}|${slug}`;
}

export default async function handler(event, context) {
  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const ip = event.headers['x-forwarded-for']?.split(',')[0] || event.headers['client-ip'] || 'unknown';
    const body = JSON.parse(event.body || '{}');
    const { slug, name, email, capacity } = body;
    if(!slug || !name || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
    }

    // Rate limiting
    const key = rateKey(ip, slug);
    const now = Date.now();
    const entry = attempts.get(key) || { count: 0, start: now };
    if(now - entry.start > WINDOW_MS) {
      entry.count = 0; entry.start = now;
    }
    entry.count += 1;
    attempts.set(key, entry);
    if(entry.count > MAX_PER_WINDOW) {
      return { statusCode: 429, body: JSON.stringify({ error: 'Too many attempts, try later' }) };
    }

    // Check current count (RLS should allow counting registrations per slug)
    const { count, error: countError } = await client
      .from('lesson_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_slug', slug);
    if(countError) throw countError;

    if(typeof capacity === 'number' && count >= capacity) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Lesson full' }) };
    }

    const { error: insertError } = await client
      .from('lesson_registrations')
      .insert({ lesson_slug: slug, name, email });

    if(insertError) throw insertError;

    return { statusCode: 201, body: JSON.stringify({ success: true }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
