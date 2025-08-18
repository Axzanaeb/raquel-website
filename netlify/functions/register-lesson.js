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
  } catch(e){ console.warn('log insert failed', e.message); }
}

async function getLessonMeta(slug){
  const { data: lessonMeta, error: metaError } = await client
    .from('lessons_public')
    .select('capacity')
    .eq('slug', slug)
    .maybeSingle();
  if(metaError) throw metaError;
  return lessonMeta;
}

async function currentCount(slug){
  const { count, error } = await client
    .from('lesson_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('lesson_slug', slug);
  if(error) throw error;
  return count;
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

function basicValidate({ slug, name, email }){
  if(!slug || !name || !email) return 'Missing fields';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email';
  if(name.length > 120) return 'Name too long';
  return null;
}

function applyRateLimit(ip, slug){
  const key = rateKey(ip, slug);
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, start: now };
  if(now - entry.start > WINDOW_MS) { entry.count = 0; entry.start = now; }
  entry.count += 1;
  attempts.set(key, entry);
  return entry.count <= MAX_PER_WINDOW;
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
    const { slug, name, email } = body;

    async function processRegistration(){
      // Basic validation
      const validationError = basicValidate({ slug, name, email });
      if(validationError) return { code: 400, payload: { error: validationError } };

      // Slug allow-list (if available)
      const valSlugs = await loadValidSlugs();
      if(valSlugs !== 'SKIP' && !valSlugs.has(slug)) {
        await logAttempt({ slug, ip, ok:false });
        return { code: 400, payload: { error: 'Invalid lesson' } };
      }

      // Rate limiting (honeypot already handled client side)
      if(!applyRateLimit(ip, slug)) {
        return { code: 429, payload: { error: 'Too many attempts, try later' } };
      }

      // Capacity & existence check (authoritative DB)
      const lessonMeta = await getLessonMeta(slug);
      if(!lessonMeta) {
        return { code: 400, payload: { error: 'Unknown lesson' } };
      }
      const authoritativeCapacity = typeof lessonMeta.capacity === 'number' ? lessonMeta.capacity : null;
      if(authoritativeCapacity !== null){
        const count = await currentCount(slug);
        if(count >= authoritativeCapacity) {
          return { code: 409, payload: { error: 'Lesson full' } };
        }
      }

      // Insert registration
      const emailHash = await sha256Hex(email);
      const { error: insertError } = await client
        .from('lesson_registrations')
        .insert({ lesson_slug: slug, name, email, email_hash: emailHash });

      if(insertError){
        if(insertError.code === '23505'){ // unique_violation
          await logAttempt({ slug, ip, ok:false });
          await insertLog({ fn:'register-lesson', slug, ip, ok:false });
          return { code: 409, payload: { error: 'Already registered' } };
        }
        throw insertError;
      }

      await insertLog({ fn:'register-lesson', slug, ip, ok:true });
      // Fire & forget emails
      sendEmails({ name, email, slug });
      return { code: 201, payload: { success: true } };
    }

    const result = await processRegistration();
    return { statusCode: result.code, body: JSON.stringify(result.payload) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
