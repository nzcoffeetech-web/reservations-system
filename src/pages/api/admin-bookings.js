import { createClient } from '@supabase/supabase-js';

export const prerender = false; // Run on server

export async function POST({ request }) {
  try {
    const { pin } = await request.json();
    const CORRECT_PIN = import.meta.env.PUBLIC_ADMIN_PIN || '8888';

    // 1. SECURITY CHECK: Is the PIN correct?
    if (pin !== CORRECT_PIN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. INITIALIZE ADMIN CLIENT (God Mode)
    // We use the Service Role Key here, which bypasses the RLS rules we just set.
    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. FETCH DATA
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, tables(label)')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify(data), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}