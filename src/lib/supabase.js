import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE THESE WITH THE KEYS FROM YOUR SCREENSHOT EARLIER ⚠️
const supabaseUrl = 'https://vjtvuhtyilxnepqtppoq.supabase.co';
const supabaseKey = 'sb_publishable_US_-DzJhJ1tTmL8Jt3rQiQ_RazmkLhL';

export const supabase = createClient(supabaseUrl, supabaseKey);
