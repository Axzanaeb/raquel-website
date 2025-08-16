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

export default async function handler(event, context){
  if(!isAdmin(context)) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  const params = event.queryStringParameters || {};
  const fn = params.fn;
  const limit = Math.min(parseInt(params.limit || '200',10), 1000);
  let query = client.from('function_logs').select('*').order('id', { ascending: false }).limit(limit);
  if(fn) query = query.eq('fn', fn);
  const { data, error } = await query;
  if(error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  return { statusCode: 200, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) };
}
