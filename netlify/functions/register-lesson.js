import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Use anon key; RLS policy must allow insert on lesson_registrations. Service key not needed for public.
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Simple in-memory cache of valid lesson slugs (populated on first invocation)
let validSlugsCache = null;
async function loadValidSlugs(){
  if(validSlugsCache) return validSlugsCache;
  try {
    // RLS: create a lightweight public table or view if needed; for now attempt to read titles from a public view if exists
    const { data, error } = await client.from('lessons_public').select('slug');
    if(!error && data) {
      validSlugsCache = new Set(data.map(r=>r.slug));
    } else {
      // Fallback: allow (skip validation) if view not present
      validSlugsCache = 'SKIP';
    }
  } catch { validSlugsCache = 'SKIP'; }
  return validSlugsCache;
}

// Basic async log function (extend later to store in dedicated table via service key in admin function)
async function logAttempt({ slug, ip, ok }){
  if(!process.env.ENABLE_FUNCTION_LOGS) return; // opt-in
  console.log(JSON.stringify({ t: Date.now(), slug, ip, ok }));
}

async function insertLog(row){
  if(!process.env.SUPABASE_SERVICE_KEY || !process.env.ENABLE_FUNCTION_LOGS) return;
  try {
    const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth:{autoRefreshToken:false, persistSession:false} });
    await svc.from('function_logs').insert(row);
  } catch(e){ /* swallow */ }
}

// Optional email (Resend) env vars
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'no-reply@example.com';
const ADMIN_NOTIFY = process.env.ADMIN_NOTIFY_EMAIL; // optional extra admin notification target

// In-memory rate limiter (ephemeral per function container)
const attempts = new Map();
const WINDOW_MS = 1000 * 60 * 10; // 10 minutes
const MAX_PER_WINDOW = 5;

function rateKey(ip, slug){
  return `${ip}|${slug}`;
}

async function sendEmails({ name, email, slug }) {
  if(!RESEND_API_KEY) return; // silently skip if not configured
  const base = process.env.SITE_URL || '';
  const userSubject = `Lesson registration received: ${slug}`;
  const userHtml = `<p>Hi ${name || ''},</p><p>Your registration for <strong>${slug}</strong> was received. We will contact you to confirm your spot.</p><p>Studio: <a href="${base}/lessons">Lessons</a></p>`;
  const adminSubject = `New registration: ${slug}`;
  const adminHtml = `<p><strong>${name}</strong> (${email}) registered for <strong>${slug}</strong>.</p>`;
  const headers = { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' };
  try {
    // User email
    await fetch('https://api.resend.com/emails', { method: 'POST', headers, body: JSON.stringify({ from: RESEND_FROM, to: email, subject: userSubject, html: userHtml }) });
    // Admin email (to site email or explicit override)
    const adminTo = ADMIN_NOTIFY || email /* fallback disabled below */;
    if(ADMIN_NOTIFY) {
      await fetch('https://api.resend.com/emails', { method: 'POST', headers, body: JSON.stringify({ from: RESEND_FROM, to: ADMIN_NOTIFY, subject: adminSubject, html: adminHtml }) });
    }
  } catch(e){
    console.warn('Email send failed', e.message);
  }
}

function sha256Hex(str){
  if(typeof crypto !== 'undefined' && crypto.subtle){
    // runtime async hashing (Netlify supports Web Crypto)
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str.toLowerCase()))
      .then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''));
  }
  // Fallback simple hash (not cryptographic) if subtle missing
  let h=0; for(let i=0;i<str.length;i++){h=(Math.imul(31,h)+str.charCodeAt(i))|0;} return Promise.resolve('fh_'+(h>>>0).toString(16));
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
    // Validate slug against list if available
    const valSlugs = await loadValidSlugs();
    if(valSlugs !== 'SKIP' && !valSlugs.has(slug)) {
      await logAttempt({ slug, ip, ok:false });
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid lesson' }) };
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
    }

    // Honeypot already handled on client; additional simple bot heuristic
    if(name.length > 120) return { statusCode: 400, body: JSON.stringify({ error: 'Name too long' }) };

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

    const emailHash = await sha256Hex(email);
    const { error: insertError } = await client
      .from('lesson_registrations')
      .insert({ lesson_slug: slug, name, email, email_hash: emailHash });

    if(insertError){
      if(insertError.code === '23505'){ // unique_violation
        await logAttempt({ slug, ip, ok:false });
        await insertLog({ fn:'register-lesson', slug, ip, ok:false });
        return { statusCode: 409, body: JSON.stringify({ error: 'Already registered' }) };
      }
      throw insertError;
    }

    await insertLog({ fn:'register-lesson', slug, ip, ok:true });
    // Fire and forget emails
    sendEmails({ name, email, slug });

    return { statusCode: 201, body: JSON.stringify({ success: true }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
