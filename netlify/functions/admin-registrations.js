import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

const client = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Simple role check via Netlify Identity JWT custom claim (expects 'app_metadata.roles' includes 'admin')
function isAdmin(context){
  try {
    const claims = context?.clientContext?.identity?.token?.claims || {};
    const roles = claims['app_metadata']?.roles || claims['https://netlify-internal/roles'] || [];
    return Array.isArray(roles) ? roles.includes('admin') : false;
  } catch { return false; }
}

export default async function handler(event, context){
  if(!isAdmin(context)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const slug = event.queryStringParameters?.slug;
  const query = client.from('lesson_registrations').select('*').order('created_at', { ascending: true });
  if(slug) query.eq('lesson_slug', slug);
  const { data, error } = await query;
  if(error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}
