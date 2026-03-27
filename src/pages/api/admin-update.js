import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export async function POST({ request }) {
  const { pin, action, id, payload } = await request.json();
  const CORRECT_PIN = import.meta.env.PUBLIC_ADMIN_PIN || '8888';

  if (pin !== CORRECT_PIN) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let result;
  
  if (action === 'update_status') {
    result = await supabaseAdmin.from('bookings').update({ status: payload }).eq('id', id);
  } else if (action === 'update_note') {
    result = await supabaseAdmin.from('bookings').update({ staff_notes: payload }).eq('id', id);
  }

  if (result.error) return new Response(JSON.stringify({ error: result.error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}