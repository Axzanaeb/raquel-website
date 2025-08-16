import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const client = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function isAdmin(context){
  try {
    const claims = context?.clientContext?.identity?.token?.claims || {};
    const roles = claims['app_metadata']?.roles || claims['https://netlify-internal/roles'] || [];
    return Array.isArray(roles) ? roles.includes('admin') : false;
  } catch { return false; }
}

export default async function handler(event, context) {
  if(!isAdmin(context)) return { statusCode: 401, body: 'Unauthorized' };
  const slug = event.queryStringParameters?.slug;
  let query = client.from('lesson_registrations').select('*').order('created_at');
  if(slug) query = query.eq('lesson_slug', slug);
  const { data, error } = await query;
  if(error) return { statusCode: 500, body: error.message };
  const header = 'lesson_slug,name,email,created_at';
  const rows = data.map(r => [r.lesson_slug, r.name.replace(/,/g,' '), r.email, r.created_at].join(','));
  const csv = [header, ...rows].join('\n');
  return { statusCode: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="registrations.csv"' }, body: csv };
}
