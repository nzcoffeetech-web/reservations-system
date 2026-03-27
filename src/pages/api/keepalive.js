import { supabase } from '../../lib/supabase';

export async function GET() {
  // 1. "Knock" on the database by asking for just 1 row (very lightweight)
  const { data, error } = await supabase
    .from('tables') // or 'businesses' once we run the new schema
    .select('id')
    .limit(1);

  if (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), { status: 500 });
  }

  // 2. Return a success message
  return new Response(JSON.stringify({ status: 'awake', time: new Date().toISOString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}